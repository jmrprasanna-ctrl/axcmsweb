const { Op } = require("sequelize");
const Answer = require("../models/Answer");
const LegalCase = require("../models/Case");
const Customer = require("../models/Customer");
const Witness = require("../models/Witness");

function toOptionalText(value) {
    const text = String(value || "").trim();
    return text ? text : null;
}

function normalizeAnswerStep(value, fallback = "STEP") {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "NEXT STEP" || raw === "NEXT_STEP" || raw === "NEXTSTEP") {
        return "NEXT_STEP";
    }
    if (raw === "STEP") {
        return "STEP";
    }
    return fallback;
}

function normalizeCaseProgressStep(value, fallback = "STEP") {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "STEP") return "STEP";
    if (raw === "FINISHED" || raw === "FINISHED_STEP" || raw === "FINISHED STEP") return "FINISHED";
    if (raw === "NEXT STEP" || raw === "NEXT_STEP" || raw === "NEXTSTEP" || raw === "PLAINT STEP" || raw === "PLAINT_STEP" || raw === "PLAINTSTEP") return "PLAINT_STEP";
    if (raw === "ANSWER STEP" || raw === "ANSWER_STEP" || raw === "ANSWERSTEP") return "ANSWER_STEP";
    if (raw === "L/W STEP" || raw === "L_W_STEP" || raw === "LW STEP" || raw === "LW_STEP" || raw === "LWSTEP") return "LW_STEP";
    if (raw === "DUDGMENT STEP" || raw === "DUDGMENT_STEP" || raw === "DUDGMENTSTEP" || raw === "JUDGMENT STEP" || raw === "JUDGMENT_STEP" || raw === "JUDGMENTSTEP") return "DUDGMENT_STEP";
    return fallback;
}

function caseStepRank(stepValue) {
    const step = normalizeCaseProgressStep(stepValue, "STEP");
    if (step === "FINISHED") return 5;
    if (step === "PLAINT_STEP") return 1;
    if (step === "ANSWER_STEP") return 2;
    if (step === "LW_STEP") return 3;
    if (step === "DUDGMENT_STEP") return 4;
    return 0;
}

function countWords(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
}

function normalizeUploads(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 20);
}

function parseBooleanInput(value, fallback) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "yes", "on"].includes(normalized)) return true;
        if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
    return fallback;
}

async function resolveCase(caseIdRaw) {
    const caseId = Number(caseIdRaw || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) {
        throw new Error("Case selection is required.");
    }
    const row = await LegalCase.findByPk(caseId);
    if (!row) {
        throw new Error("Selected case not found.");
    }
    return row;
}

async function isLatestAnswerEntry(row) {
    const caseNo = String(row?.case_no || "").trim();
    if (!caseNo) return true;
    const step = normalizeAnswerStep(row?.answer_step, "STEP");
    const latest = await Answer.findOne({
        where: { case_no: caseNo, answer_step: step },
        order: [["answer_date", "DESC"], ["id", "DESC"]],
    });
    return Number(latest?.id || 0) === Number(row?.id || 0);
}

exports.getAnswers = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const step = normalizeAnswerStep(req.query.step, "");
        const where = {};
        if (q) {
            where[Op.or] = [
                { case_no: { [Op.iLike]: `%${q}%` } },
                { customer_name: { [Op.iLike]: `%${q}%` } },
                { court: { [Op.iLike]: `%${q}%` } },
                { attend_lawyer: { [Op.iLike]: `%${q}%` } },
            ];
        }
        if (step) {
            where.answer_step = step;
        }
        const rows = await Answer.findAll({
            where,
            include: [
                { model: LegalCase, required: false, attributes: ["id", "case_no", "case_date"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
            order: [["answer_date", "DESC"], ["id", "DESC"]],
        });
        const caseNos = rows
            .map((row) => String(row.case_no || "").trim())
            .filter(Boolean);
        const caseStatusRows = caseNos.length
            ? await LegalCase.findAll({
                where: { case_no: caseNos },
                attributes: ["case_no", "case_step", "case_date", "id"],
                order: [["case_no", "ASC"], ["case_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const caseStatusByNo = new Map();
        (Array.isArray(caseStatusRows) ? caseStatusRows : []).forEach((row) => {
            const key = String(row.case_no || "").trim().toUpperCase();
            if (!key) return;
            const normalized = normalizeCaseProgressStep(row.case_step, "STEP");
            const rank = caseStepRank(normalized);
            const current = caseStatusByNo.get(key);
            if (!current || rank > current.rank) {
                caseStatusByNo.set(key, { step: normalized, rank });
            }
        });
        const scopedRows = rows;
        const answerIds = scopedRows
            .map((row) => Number(row.id || 0))
            .filter((id) => Number.isFinite(id) && id > 0);
        const witnessRows = answerIds.length
            ? await Witness.findAll({
                where: { answer_id: answerIds },
                attributes: ["answer_id"],
                raw: true,
            })
            : [];
        const witnessAnswerSet = new Set(
            (Array.isArray(witnessRows) ? witnessRows : [])
                .map((row) => Number(row.answer_id || 0))
                .filter((id) => Number.isFinite(id) && id > 0)
        );
        const seenCaseNos = new Set();
        const payload = scopedRows.map((row) => {
            const plain = row.toJSON ? row.toJSON() : row;
            const caseNoKey = String(plain.case_no || "").trim().toUpperCase();
            const stepKey = normalizeAnswerStep(plain.answer_step, "STEP");
            const latestKey = `${caseNoKey}::${stepKey}`;
            const latest_case_no_entry = caseNoKey
                ? !seenCaseNos.has(latestKey)
                : true;
            if (caseNoKey) {
                seenCaseNos.add(latestKey);
            }
            return {
                ...plain,
                witness_created: witnessAnswerSet.has(Number(plain.id || 0)),
                latest_case_no_entry,
            };
        });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load answer records." });
    }
};

exports.getAnswerById = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid answer id." });
        }
        const row = await Answer.findByPk(id, {
            include: [
                { model: LegalCase, required: false, attributes: ["id", "case_no", "case_date"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
        });
        if (!row) {
            return res.status(404).json({ message: "Answer not found." });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load answer." });
    }
};

exports.createAnswer = async (req, res) => {
    try {
        const answer_date = String(req.body.answer_date || "").trim() || new Date().toISOString().slice(0, 10);
        const comment = toOptionalText(req.body.comment);
        const answer_step = normalizeAnswerStep(req.body.answer_step, "STEP");
        const upload_method = toOptionalText(req.body.upload_method);
        const uploads_json = normalizeUploads(req.body.uploads_json || req.body.uploads);
        const edit_enabled = false;

        if (countWords(comment) > 1000) {
            return res.status(400).json({ message: "Comment supports up to 1000 words." });
        }

        const caseRow = await resolveCase(req.body.case_id);
        const created = await Answer.create({
            answer_date,
            plaint_id: Number(req.body.plaint_id || 0) > 0 ? Number(req.body.plaint_id) : null,
            case_id: caseRow.id,
            customer_id: caseRow.customer_id || null,
            customer_name: caseRow.customer_name,
            case_no: caseRow.case_no,
            court: caseRow.court,
            attend_lawyer: caseRow.attend_lawyer,
            answer_step,
            comment,
            upload_method,
            uploads_json,
            edit_enabled,
        });
        res.status(201).json(created);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to create answer." });
    }
};

exports.updateAnswer = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid answer id." });
        }
        const row = await Answer.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Answer not found." });
        }
        if (!(await isLatestAnswerEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }

        const current = row.toJSON ? row.toJSON() : row;
        const dataFieldKeys = ["answer_date", "case_id", "comment", "answer_step"];
        const uploadFieldKeys = ["upload_method", "uploads_json", "uploads"];
        const hasDataFieldInput = dataFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasUploadFieldInput = uploadFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasAnyFieldInput = hasDataFieldInput || hasUploadFieldInput;
        const nextEditEnabled = parseBooleanInput(req.body.edit_enabled, Boolean(current.edit_enabled));
        if (!current.edit_enabled && hasDataFieldInput) {
            return res.status(403).json({ message: "Edit is locked. Only uploads can be changed." });
        }

        const updatePayload = { edit_enabled: nextEditEnabled };
        if (hasAnyFieldInput) {
            const answer_date = String(req.body.answer_date || "").trim() || current.answer_date;
            const comment = Object.prototype.hasOwnProperty.call(req.body, "comment")
                ? toOptionalText(req.body.comment)
                : current.comment;
            const answer_step = Object.prototype.hasOwnProperty.call(req.body, "answer_step")
                ? normalizeAnswerStep(req.body.answer_step, normalizeAnswerStep(current.answer_step, "STEP"))
                : normalizeAnswerStep(current.answer_step, "STEP");
            const upload_method = Object.prototype.hasOwnProperty.call(req.body, "upload_method")
                ? toOptionalText(req.body.upload_method)
                : current.upload_method;
            const uploads_json = Object.prototype.hasOwnProperty.call(req.body, "uploads_json")
                || Object.prototype.hasOwnProperty.call(req.body, "uploads")
                ? normalizeUploads(req.body.uploads_json || req.body.uploads)
                : normalizeUploads(current.uploads_json);

            if ((current.edit_enabled || nextEditEnabled) && countWords(comment) > 1000) {
                return res.status(400).json({ message: "Comment supports up to 1000 words." });
            }

            if (current.edit_enabled || nextEditEnabled) {
                const caseRow = await resolveCase(req.body.case_id || current.case_id);
                updatePayload.answer_date = answer_date;
                updatePayload.plaint_id = Object.prototype.hasOwnProperty.call(req.body, "plaint_id")
                    ? (Number(req.body.plaint_id || 0) > 0 ? Number(req.body.plaint_id) : null)
                    : current.plaint_id;
                updatePayload.case_id = caseRow.id;
                updatePayload.customer_id = caseRow.customer_id || null;
                updatePayload.customer_name = caseRow.customer_name;
                updatePayload.case_no = caseRow.case_no;
                updatePayload.court = caseRow.court;
                updatePayload.attend_lawyer = caseRow.attend_lawyer;
                updatePayload.answer_step = answer_step;
                updatePayload.comment = comment;
            }
            updatePayload.upload_method = upload_method;
            updatePayload.uploads_json = uploads_json;
        }

        const requestedDate = String(updatePayload.answer_date || "").trim();
        const currentDate = String(current.answer_date || "").trim();
        const shouldCreateNewEntry = Boolean(current.edit_enabled || nextEditEnabled)
            && hasDataFieldInput
            && requestedDate
            && currentDate
            && requestedDate !== currentDate;
        if (shouldCreateNewEntry) {
            const created = await Answer.create({
                answer_date: updatePayload.answer_date || current.answer_date,
                plaint_id: Object.prototype.hasOwnProperty.call(updatePayload, "plaint_id")
                    ? updatePayload.plaint_id
                    : current.plaint_id,
                case_id: updatePayload.case_id || current.case_id,
                customer_id: Object.prototype.hasOwnProperty.call(updatePayload, "customer_id")
                    ? updatePayload.customer_id
                    : current.customer_id,
                customer_name: updatePayload.customer_name || current.customer_name,
                case_no: updatePayload.case_no || current.case_no,
                court: updatePayload.court || current.court,
                attend_lawyer: updatePayload.attend_lawyer || current.attend_lawyer,
                answer_step: Object.prototype.hasOwnProperty.call(updatePayload, "answer_step")
                    ? updatePayload.answer_step
                    : normalizeAnswerStep(current.answer_step, "STEP"),
                comment: Object.prototype.hasOwnProperty.call(updatePayload, "comment")
                    ? updatePayload.comment
                    : current.comment,
                upload_method: Object.prototype.hasOwnProperty.call(updatePayload, "upload_method")
                    ? updatePayload.upload_method
                    : current.upload_method,
                uploads_json: Object.prototype.hasOwnProperty.call(updatePayload, "uploads_json")
                    ? updatePayload.uploads_json
                    : normalizeUploads(current.uploads_json),
                edit_enabled: false,
            });
            const payload = created.toJSON ? created.toJSON() : created;
            return res.status(201).json({
                ...payload,
                created_as_new: true,
                cloned_from_id: current.id,
                message: "Answer date changed. New answer entry created and original kept.",
            });
        }

        await row.update(updatePayload);
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to update answer." });
    }
};

exports.deleteAnswer = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid answer id." });
        }
        const row = await Answer.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Answer not found." });
        }
        if (!(await isLatestAnswerEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }
        if (!row.edit_enabled) {
            return res.status(403).json({ message: "Edit is locked. Tick Edit checkbox first." });
        }
        await row.destroy();
        res.json({ message: "Answer deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete answer." });
    }
};
