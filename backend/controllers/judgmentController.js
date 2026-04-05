const { Op } = require("sequelize");
const Judgment = require("../models/Judgment");
const LegalCase = require("../models/Case");
const Customer = require("../models/Customer");

function toOptionalText(value) {
    const text = String(value || "").trim();
    return text ? text : null;
}

function normalizeUploads(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 20);
}

function countWords(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
}

function hasWords(value) {
    return countWords(value) > 0;
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

async function ensureFinishedCaseEntryForJudgment(judgmentLike) {
    const caseNo = String(judgmentLike?.case_no || "").trim();
    if (!caseNo) return null;
    const existing = await LegalCase.findOne({
        where: { case_no: caseNo, case_step: "FINISHED" },
        order: [["case_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;
    const caseDate = String(judgmentLike?.judgment_date || "").trim() || new Date().toISOString().slice(0, 10);
    return LegalCase.create({
        case_no: caseNo,
        case_date: caseDate,
        next_date: null,
        customer_id: Number(judgmentLike?.customer_id || 0) > 0 ? Number(judgmentLike.customer_id) : null,
        customer_name: String(judgmentLike?.customer_name || "").trim(),
        court: String(judgmentLike?.court || "").trim(),
        attend_lawyer: String(judgmentLike?.attend_lawyer || "").trim(),
        case_step: "FINISHED",
        comment: toOptionalText(judgmentLike?.comment),
        upload_method: toOptionalText(judgmentLike?.upload_method),
        uploads_json: normalizeUploads(judgmentLike?.uploads_json),
        edit_enabled: false,
    });
}

async function isLatestJudgmentEntry(row) {
    const caseNo = String(row?.case_no || "").trim();
    if (!caseNo) return true;
    const latest = await Judgment.findOne({
        where: { case_no: caseNo },
        order: [["judgment_date", "DESC"], ["id", "DESC"]],
    });
    return Number(latest?.id || 0) === Number(row?.id || 0);
}

exports.getJudgments = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const where = {};
        if (q) {
            where[Op.or] = [
                { case_no: { [Op.iLike]: `%${q}%` } },
                { customer_name: { [Op.iLike]: `%${q}%` } },
                { court: { [Op.iLike]: `%${q}%` } },
                { attend_lawyer: { [Op.iLike]: `%${q}%` } },
            ];
        }
        const rows = await Judgment.findAll({
            where,
            include: [
                { model: LegalCase, required: false, attributes: ["id", "case_no", "case_date"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
            order: [["judgment_date", "DESC"], ["id", "DESC"]],
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
        const seenCaseNos = new Set();
        const payload = scopedRows.map((row) => {
            const plain = row.toJSON ? row.toJSON() : row;
            const caseNoKey = String(plain.case_no || "").trim().toUpperCase();
            const latest_case_no_entry = caseNoKey
                ? !seenCaseNos.has(caseNoKey)
                : true;
            if (caseNoKey) {
                seenCaseNos.add(caseNoKey);
            }
            return {
                ...plain,
                latest_case_no_entry,
            };
        });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load judgment records." });
    }
};

exports.getJudgmentById = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid judgment id." });
        }
        const row = await Judgment.findByPk(id, {
            include: [
                { model: LegalCase, required: false, attributes: ["id", "case_no", "case_date"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
        });
        if (!row) {
            return res.status(404).json({ message: "Judgment record not found." });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load judgment record." });
    }
};

exports.createJudgment = async (req, res) => {
    try {
        const judgment_date = String(req.body.judgment_date || "").trim() || new Date().toISOString().slice(0, 10);
        const judgment_text = toOptionalText(req.body.judgment_text);
        const comment = toOptionalText(req.body.comment);
        const upload_method = toOptionalText(req.body.upload_method);
        const uploads_json = normalizeUploads(req.body.uploads_json || req.body.uploads);
        const finished = hasWords(judgment_text);
        const edit_enabled = false;
        if (countWords(comment) > 1000) {
            return res.status(400).json({ message: "Comment supports up to 1000 words." });
        }

        const caseRow = await resolveCase(req.body.case_id);
        const existingForCase = await Judgment.findOne({ where: { case_id: caseRow.id } });
        if (existingForCase) {
            return res.status(400).json({ message: "Dugement already created for this case." });
        }

        const created = await Judgment.create({
            judgment_date,
            case_id: caseRow.id,
            customer_id: caseRow.customer_id || null,
            customer_name: caseRow.customer_name,
            case_no: caseRow.case_no,
            court: caseRow.court,
            attend_lawyer: caseRow.attend_lawyer,
            judgment_text,
            comment,
            upload_method,
            uploads_json,
            finished,
            edit_enabled,
        });
        if (finished) {
            await ensureFinishedCaseEntryForJudgment(created);
        }
        res.status(201).json(created);
    } catch (err) {
        if (String(err?.name || "").toLowerCase() === "sequelizeuniqueconstrainterror") {
            return res.status(400).json({ message: "Dugement already created for this case." });
        }
        res.status(500).json({ message: err.message || "Failed to create judgment record." });
    }
};

exports.updateJudgment = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid judgment id." });
        }
        const row = await Judgment.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Judgment record not found." });
        }
        if (!(await isLatestJudgmentEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }
        const current = row.toJSON ? row.toJSON() : row;
        const dataFieldKeys = ["judgment_date", "judgment_text", "comment", "finished"];
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
            const judgment_date = String(req.body.judgment_date || "").trim() || current.judgment_date;
            const judgment_text = Object.prototype.hasOwnProperty.call(req.body, "judgment_text")
                ? toOptionalText(req.body.judgment_text)
                : current.judgment_text;
            const comment = Object.prototype.hasOwnProperty.call(req.body, "comment")
                ? toOptionalText(req.body.comment)
                : current.comment;
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
                updatePayload.judgment_date = judgment_date;
                updatePayload.judgment_text = judgment_text;
                updatePayload.comment = comment;
                updatePayload.finished = hasWords(judgment_text);
            }
            updatePayload.upload_method = upload_method;
            updatePayload.uploads_json = uploads_json;
        }

        const requestedDate = String(updatePayload.judgment_date || "").trim();
        const currentDate = String(current.judgment_date || "").trim();
        const shouldCreateNewEntry = Boolean(current.edit_enabled || nextEditEnabled)
            && hasDataFieldInput
            && requestedDate
            && currentDate
            && requestedDate !== currentDate;
        if (shouldCreateNewEntry) {
            const created = await Judgment.create({
                judgment_date: updatePayload.judgment_date || current.judgment_date,
                case_id: current.case_id,
                customer_id: current.customer_id,
                customer_name: current.customer_name,
                case_no: current.case_no,
                court: current.court,
                attend_lawyer: current.attend_lawyer,
                judgment_text: Object.prototype.hasOwnProperty.call(updatePayload, "judgment_text")
                    ? updatePayload.judgment_text
                    : current.judgment_text,
                comment: Object.prototype.hasOwnProperty.call(updatePayload, "comment")
                    ? updatePayload.comment
                    : current.comment,
                upload_method: Object.prototype.hasOwnProperty.call(updatePayload, "upload_method")
                    ? updatePayload.upload_method
                    : current.upload_method,
                uploads_json: Object.prototype.hasOwnProperty.call(updatePayload, "uploads_json")
                    ? updatePayload.uploads_json
                    : normalizeUploads(current.uploads_json),
                finished: Object.prototype.hasOwnProperty.call(updatePayload, "finished")
                    ? updatePayload.finished
                    : Boolean(current.finished),
                edit_enabled: false,
            });
            const payload = created.toJSON ? created.toJSON() : created;
            if (Boolean(payload.finished)) {
                await ensureFinishedCaseEntryForJudgment(payload);
            }
            return res.status(201).json({
                ...payload,
                created_as_new: true,
                cloned_from_id: current.id,
                message: "Dugement date changed. New dugement entry created and original kept.",
            });
        }

        await row.update(updatePayload);
        const updated = row.toJSON ? row.toJSON() : row;
        if (Boolean(updated.finished)) {
            await ensureFinishedCaseEntryForJudgment(updated);
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to update judgment record." });
    }
};

exports.deleteJudgment = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid judgment id." });
        }
        const row = await Judgment.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Judgment record not found." });
        }
        if (!(await isLatestJudgmentEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }
        if (!row.edit_enabled) {
            return res.status(403).json({ message: "Edit is locked. Tick Edit checkbox first." });
        }
        await row.destroy();
        res.json({ message: "Judgment record deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete judgment record." });
    }
};
