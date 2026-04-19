const { Op } = require("sequelize");
const Plaint = require("../models/Plaint");
const LegalCase = require("../models/Case");
const Customer = require("../models/Customer");
const Answer = require("../models/Answer");

function toOptionalText(value) {
    const text = String(value || "").trim();
    return text ? text : null;
}

function normalizePlaintStep(value, fallback = "STEP") {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "NEXT STEP" || raw === "NEXT_STEP" || raw === "NEXTSTEP" || raw === "ANSWER STEP" || raw === "ANSWER_STEP" || raw === "ANSWERSTEP") {
        return "ANSWER_STEP";
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

async function isLatestPlaintEntry(row) {
    const caseNo = String(row?.case_no || "").trim();
    if (!caseNo) return true;
    const step = normalizePlaintStep(row?.plaint_step, "STEP");
    const latest = await Plaint.findOne({
        where: { case_no: caseNo, plaint_step: step },
        order: [["plaint_date", "DESC"], ["id", "DESC"]],
    });
    return Number(latest?.id || 0) === Number(row?.id || 0);
}

async function ensureAnswerEntryForPlaint(plaintRowLike) {
    const plaintId = Number(plaintRowLike?.id || 0);
    if (!Number.isFinite(plaintId) || plaintId <= 0) return null;

    const existing = await Answer.findOne({
        where: { plaint_id: plaintId },
        order: [["answer_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;

    const answer_date = String(plaintRowLike?.plaint_date || "").trim() || new Date().toISOString().slice(0, 10);
    const created = await Answer.create({
        answer_date,
        plaint_id: plaintId,
        case_id: Number(plaintRowLike?.case_id || 0) > 0 ? Number(plaintRowLike.case_id) : null,
        customer_id: Number(plaintRowLike?.customer_id || 0) > 0 ? Number(plaintRowLike.customer_id) : null,
        customer_name: String(plaintRowLike?.customer_name || "").trim(),
        case_no: String(plaintRowLike?.case_no || "").trim(),
        court: String(plaintRowLike?.court || "").trim(),
        attend_lawyer: String(plaintRowLike?.attend_lawyer || "").trim(),
        answer_step: "STEP",
        comment: toOptionalText(plaintRowLike?.comment),
        upload_method: toOptionalText(plaintRowLike?.upload_method),
        uploads_json: normalizeUploads(plaintRowLike?.uploads_json),
        edit_enabled: false,
    });
    return created;
}

async function promoteLinkedCaseToAnswerStep(caseIdRaw) {
    const caseId = Number(caseIdRaw || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) return null;
    const caseRow = await LegalCase.findByPk(caseId);
    if (!caseRow) return null;
    const currentStep = normalizeCaseProgressStep(caseRow.case_step, "STEP");
    if (caseStepRank(currentStep) < caseStepRank("ANSWER_STEP")) {
        await caseRow.update({ case_step: "ANSWER_STEP" });
    }
    return caseRow;
}

function normalizeClientRequestId(value) {
    const text = String(value || "").trim();
    if (!text) return null;
    return text.slice(0, 80);
}

async function findPlaintByClientRequestId(clientRequestId) {
    const token = normalizeClientRequestId(clientRequestId);
    if (!token) return null;
    return Plaint.findOne({ where: { client_request_id: token } });
}

function isClientRequestUniqueError(err) {
    const name = String(err?.name || "").toLowerCase();
    const msg = String(err?.message || "").toLowerCase();
    return name.includes("unique") && msg.includes("client_request_id");
}

exports.getPlaints = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const step = normalizePlaintStep(req.query.step, "");
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
            where.plaint_step = step;
        }
        const rows = await Plaint.findAll({
            where,
            include: [
                { model: LegalCase, required: true, attributes: ["id", "case_no", "case_date", "case_step"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
            order: [["plaint_date", "DESC"], ["id", "DESC"]],
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
            const step = normalizeCaseProgressStep(row.case_step, "STEP");
            const rank = step === "PLAINT_STEP" ? 1 : step === "ANSWER_STEP" ? 2 : step === "LW_STEP" ? 3 : step === "DUDGMENT_STEP" ? 4 : 0;
            const current = caseStatusByNo.get(key);
            if (!current || rank > current.rank) {
                caseStatusByNo.set(key, { step, rank });
            }
        });
        const scopedRows = rows;
        const caseIds = scopedRows
            .map((row) => Number(row.case_id || 0))
            .filter((id) => Number.isFinite(id) && id > 0);
        const answerRows = (caseIds.length || caseNos.length)
            ? await Answer.findAll({
                where: {
                    [Op.or]: [
                        { case_id: caseIds },
                        { case_no: caseNos },
                    ],
                },
                attributes: ["case_id", "plaint_id", "case_no"],
                raw: true,
            })
            : [];
        const answeredPlaintSet = new Set(
            (Array.isArray(answerRows) ? answerRows : [])
                .map((row) => Number(row.plaint_id || 0))
                .filter((id) => Number.isFinite(id) && id > 0)
        );
        const seenCaseNos = new Set();
        const payload = scopedRows.map((row) => {
            const plain = row.toJSON ? row.toJSON() : row;
            const caseNoKey = String(plain.case_no || "").trim().toUpperCase();
            const stepKey = normalizePlaintStep(plain.plaint_step, "STEP");
            const latestKey = `${caseNoKey}::${stepKey}`;
            const latest_case_no_entry = caseNoKey
                ? !seenCaseNos.has(latestKey)
                : true;
            if (caseNoKey) {
                seenCaseNos.add(latestKey);
            }
            return {
                ...plain,
                answer_created: answeredPlaintSet.has(Number(plain.id || 0)),
                latest_case_no_entry,
            };
        });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load plaint records." });
    }
};

exports.getPlaintById = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid plaint id." });
        }
        const row = await Plaint.findByPk(id, {
            include: [
                { model: LegalCase, required: false, attributes: ["id", "case_no", "case_date"] },
                { model: Customer, required: false, attributes: ["id", "name"] },
            ],
        });
        if (!row) {
            return res.status(404).json({ message: "Plaint not found." });
        }
        res.json(row);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load plaint." });
    }
};

exports.createPlaint = async (req, res) => {
    try {
        const plaint_date = String(req.body.plaint_date || "").trim() || new Date().toISOString().slice(0, 10);
        const comment = toOptionalText(req.body.comment);
        const answer = toOptionalText(req.body.answer);
        const witness_list = toOptionalText(req.body.witness_list);
        const dudgement = toOptionalText(req.body.dudgement);
        const plaint_step = normalizePlaintStep(req.body.plaint_step, "STEP");
        const finished = Boolean(req.body.finished);
        const upload_method = toOptionalText(req.body.upload_method);
        const uploads_json = normalizeUploads(req.body.uploads_json || req.body.uploads);
        const edit_enabled = false;

        if (countWords(comment) > 1000) {
            return res.status(400).json({ message: "Comment supports up to 1000 words." });
        }

        const caseRow = await resolveCase(req.body.case_id);
        const created = await Plaint.create({
            plaint_date,
            case_id: caseRow.id,
            customer_id: caseRow.customer_id || null,
            customer_name: caseRow.customer_name,
            case_no: caseRow.case_no,
            court: caseRow.court,
            attend_lawyer: caseRow.attend_lawyer,
            plaint_step,
            comment,
            upload_method,
            uploads_json,
            answer,
            witness_list,
            dudgement,
            finished,
            edit_enabled,
        });
        let payload = created.toJSON ? created.toJSON() : created;
        if (payload.plaint_step === "ANSWER_STEP") {
            const answerEntry = await ensureAnswerEntryForPlaint(payload);
            await promoteLinkedCaseToAnswerStep(payload.case_id);
            payload = {
                ...payload,
                moved_to_answer: true,
                answer_id: Number(answerEntry?.id || 0) || null,
            };
        }
        res.status(201).json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to create plaint." });
    }
};

exports.updatePlaint = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid plaint id." });
        }
        const row = await Plaint.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Plaint not found." });
        }
        if (!(await isLatestPlaintEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }

        const current = row.toJSON ? row.toJSON() : row;
        const dataFieldKeys = ["plaint_date", "case_id", "comment", "answer", "witness_list", "dudgement", "finished", "plaint_step"];
        const uploadFieldKeys = ["upload_method", "uploads_json", "uploads"];
        const hasDataFieldInput = dataFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasUploadFieldInput = uploadFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasAnyFieldInput = hasDataFieldInput || hasUploadFieldInput;
        const clientRequestId = normalizeClientRequestId(req.body.client_request_id);
        const nextEditEnabled = parseBooleanInput(req.body.edit_enabled, Boolean(current.edit_enabled));

        if (!current.edit_enabled && hasDataFieldInput) {
            return res.status(403).json({ message: "Edit is locked. Only uploads can be changed." });
        }

        const updatePayload = { edit_enabled: nextEditEnabled };
        if (clientRequestId) {
            updatePayload.client_request_id = clientRequestId;
        }
        if (hasAnyFieldInput) {
            const plaint_date = String(req.body.plaint_date || "").trim() || current.plaint_date;
            const comment = Object.prototype.hasOwnProperty.call(req.body, "comment")
                ? toOptionalText(req.body.comment)
                : current.comment;
            const answer = Object.prototype.hasOwnProperty.call(req.body, "answer")
                ? toOptionalText(req.body.answer)
                : current.answer;
            const witness_list = Object.prototype.hasOwnProperty.call(req.body, "witness_list")
                ? toOptionalText(req.body.witness_list)
                : current.witness_list;
            const dudgement = Object.prototype.hasOwnProperty.call(req.body, "dudgement")
                ? toOptionalText(req.body.dudgement)
                : current.dudgement;
            const plaint_step = Object.prototype.hasOwnProperty.call(req.body, "plaint_step")
                ? normalizePlaintStep(req.body.plaint_step, normalizePlaintStep(current.plaint_step, "STEP"))
                : normalizePlaintStep(current.plaint_step, "STEP");
            const finished = Object.prototype.hasOwnProperty.call(req.body, "finished")
                ? Boolean(req.body.finished)
                : Boolean(current.finished);
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
                updatePayload.plaint_date = plaint_date;
                updatePayload.case_id = caseRow.id;
                updatePayload.customer_id = caseRow.customer_id || null;
                updatePayload.customer_name = caseRow.customer_name;
                updatePayload.case_no = caseRow.case_no;
                updatePayload.court = caseRow.court;
                updatePayload.attend_lawyer = caseRow.attend_lawyer;
                updatePayload.comment = comment;
                updatePayload.answer = answer;
                updatePayload.witness_list = witness_list;
                updatePayload.dudgement = dudgement;
                updatePayload.plaint_step = plaint_step;
                updatePayload.finished = finished;
            }
            updatePayload.upload_method = upload_method;
            updatePayload.uploads_json = uploads_json;
        }

        const requestedDate = String(updatePayload.plaint_date || "").trim();
        const currentDate = String(current.plaint_date || "").trim();
        const shouldCreateNewEntry = Boolean(current.edit_enabled || nextEditEnabled)
            && hasDataFieldInput
            && requestedDate
            && currentDate
            && requestedDate !== currentDate;

        if (shouldCreateNewEntry) {
            if (clientRequestId) {
                const alreadyCreated = await findPlaintByClientRequestId(clientRequestId);
                if (alreadyCreated) {
                    const plain = alreadyCreated.toJSON ? alreadyCreated.toJSON() : alreadyCreated;
                    return res.json({
                        ...plain,
                        created_as_new: true,
                        deduplicated: true,
                        cloned_from_id: current.id,
                    });
                }
            }
            const created = await Plaint.create({
                plaint_date: updatePayload.plaint_date || current.plaint_date,
                case_id: updatePayload.case_id || current.case_id,
                customer_id: Object.prototype.hasOwnProperty.call(updatePayload, "customer_id")
                    ? updatePayload.customer_id
                    : current.customer_id,
                customer_name: updatePayload.customer_name || current.customer_name,
                case_no: updatePayload.case_no || current.case_no,
                court: updatePayload.court || current.court,
                attend_lawyer: updatePayload.attend_lawyer || current.attend_lawyer,
                comment: Object.prototype.hasOwnProperty.call(updatePayload, "comment")
                    ? updatePayload.comment
                    : current.comment,
                upload_method: Object.prototype.hasOwnProperty.call(updatePayload, "upload_method")
                    ? updatePayload.upload_method
                    : current.upload_method,
                uploads_json: Object.prototype.hasOwnProperty.call(updatePayload, "uploads_json")
                    ? updatePayload.uploads_json
                    : normalizeUploads(current.uploads_json),
                answer: Object.prototype.hasOwnProperty.call(updatePayload, "answer")
                    ? updatePayload.answer
                    : current.answer,
                witness_list: Object.prototype.hasOwnProperty.call(updatePayload, "witness_list")
                    ? updatePayload.witness_list
                    : current.witness_list,
                dudgement: Object.prototype.hasOwnProperty.call(updatePayload, "dudgement")
                    ? updatePayload.dudgement
                    : current.dudgement,
                plaint_step: Object.prototype.hasOwnProperty.call(updatePayload, "plaint_step")
                    ? updatePayload.plaint_step
                    : normalizePlaintStep(current.plaint_step, "STEP"),
                finished: Object.prototype.hasOwnProperty.call(updatePayload, "finished")
                    ? updatePayload.finished
                    : Boolean(current.finished),
                client_request_id: clientRequestId,
                edit_enabled: false,
            });
            let payload = created.toJSON ? created.toJSON() : created;
            if (payload.plaint_step === "ANSWER_STEP") {
                const answerEntry = await ensureAnswerEntryForPlaint(payload);
                await promoteLinkedCaseToAnswerStep(payload.case_id);
                payload = {
                    ...payload,
                    moved_to_answer: true,
                    answer_id: Number(answerEntry?.id || 0) || null,
                };
            }
            return res.status(201).json({
                ...payload,
                created_as_new: true,
                cloned_from_id: current.id,
                message: "Plaint date changed. New plaint entry created and original kept.",
            });
        }

        await row.update(updatePayload);
        const updated = row.toJSON ? row.toJSON() : row;
        if (normalizePlaintStep(updated.plaint_step, "STEP") === "ANSWER_STEP") {
            const answerEntry = await ensureAnswerEntryForPlaint(updated);
            await promoteLinkedCaseToAnswerStep(updated.case_id);
            return res.json({
                ...updated,
                moved_to_answer: true,
                answer_id: Number(answerEntry?.id || 0) || null,
            });
        }
        res.json(updated);
    } catch (err) {
        const clientRequestId = normalizeClientRequestId(req.body?.client_request_id);
        if (clientRequestId && isClientRequestUniqueError(err)) {
            const existing = await findPlaintByClientRequestId(clientRequestId);
            if (existing) {
                const plain = existing.toJSON ? existing.toJSON() : existing;
                return res.json({
                    ...plain,
                    created_as_new: true,
                    deduplicated: true,
                });
            }
        }
        res.status(500).json({ message: err.message || "Failed to update plaint." });
    }
};

exports.deletePlaint = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid plaint id." });
        }
        const row = await Plaint.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Plaint not found." });
        }
        if (!(await isLatestPlaintEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }
        if (!row.edit_enabled) {
            return res.status(403).json({ message: "Edit is locked. Tick Edit checkbox first." });
        }
        await row.destroy();
        res.json({ message: "Plaint deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete plaint." });
    }
};
