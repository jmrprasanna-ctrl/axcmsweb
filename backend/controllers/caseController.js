const fs = require("fs");
const path = require("path");
const { Op, fn, col, where } = require("sequelize");
const LegalCase = require("../models/Case");
const Customer = require("../models/Customer");
const Court = require("../models/Court");
const Lawyer = require("../models/Lawyer");
const Plaint = require("../models/Plaint");
const Answer = require("../models/Answer");
const Witness = require("../models/Witness");
const Judgment = require("../models/Judgment");

const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads");

function parseDataUrl(raw) {
    const value = String(raw || "").trim();
    if (!value.startsWith("data:")) return null;
    const commaIndex = value.indexOf(",");
    if (commaIndex === -1) return null;
    const header = value.slice(5, commaIndex);
    const payload = value.slice(commaIndex + 1);
    const isBase64 = /;base64/i.test(header);
    const buffer = isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8");
    const mime = header.split(";")[0] || "application/octet-stream";
    return { mime, buffer };
}

function safeFileName(name, fallback = "file") {
    const base = String(name || "").trim();
    const safe = path.basename(base).replace(/[\\/:*?"<>|#%{}~]+/g, "_");
    return safe || fallback;
}

function extFromMime(mime) {
    const lower = String(mime || "").toLowerCase();
    if (lower.includes("jpeg")) return "jpg";
    if (lower.includes("png")) return "png";
    if (lower.includes("gif")) return "gif";
    if (lower.includes("bmp")) return "bmp";
    if (lower.includes("webp")) return "webp";
    if (lower.includes("pdf")) return "pdf";
    if (lower.includes("msword") || lower.includes("word")) return "doc";
    if (lower.includes("officedocument.wordprocessingml.document")) return "docx";
    if (lower.includes("spreadsheet") || lower.includes("excel")) return "xls";
    return "bin";
}

function buildDocumentFileName(caseNo, type, index, raw) {
    const safeCase = safeFileName(caseNo || "case");
    const baseIndex = Number(index || 0) + 1;
    const parsed = parseDataUrl(raw);
    if (parsed && parsed.mime) {
        const ext = extFromMime(parsed.mime);
        return `${safeFileName(type || "document")}_${safeCase}_${baseIndex}.${ext}`;
    }
    const rawName = safeFileName(raw || "document");
    if (rawName) return rawName;
    return `${safeFileName(type || "document")}_${safeCase}_${baseIndex}.bin`;
}

async function getFolderUploads(caseNo, type) {
    const normalizedCase = String(caseNo || "").trim();
    const normalizedType = String(type || "").trim().toLowerCase();
    if (!normalizedCase || !["step", "plaint", "answer", "witness", "judgment"].includes(normalizedType)) {
        return [];
    }

    const uploads = [];
    if (normalizedType === "step") {
        const rows = await LegalCase.findAll({
            where: { case_no: normalizedCase, case_step: "STEP" },
            attributes: ["uploads_json"],
            order: [["case_date", "DESC"], ["id", "DESC"]],
            raw: true,
        });
        rows.forEach((row) => {
            if (Array.isArray(row.uploads_json)) {
                uploads.push(...row.uploads_json);
            }
        });
    } else {
        const Model = normalizedType === "plaint" ? Plaint : normalizedType === "answer" ? Answer : normalizedType === "witness" ? Witness : Judgment;
        const dateField = normalizedType === "plaint" ? "plaint_date" : normalizedType === "answer" ? "answer_date" : normalizedType === "witness" ? "witness_date" : "judgment_date";
        const rows = await Model.findAll({
            where: { case_no: normalizedCase },
            attributes: ["uploads_json"],
            order: [[dateField, "DESC"], ["id", "DESC"]],
            raw: true,
        });
        rows.forEach((row) => {
            if (Array.isArray(row.uploads_json)) {
                uploads.push(...row.uploads_json);
            }
        });
    }
    return uploads;
}

exports.downloadFolderDocument = async (req, res) => {
    try {
        const caseNo = String(req.query.case_no || "").trim();
        const type = String(req.query.type || "").trim().toLowerCase();
        const index = Number(req.query.index || 0);

        if (!caseNo) {
            return res.status(400).json({ message: "Case no is required." });
        }
        if (!["step", "plaint", "answer", "witness", "judgment"].includes(type)) {
            return res.status(400).json({ message: "Invalid type." });
        }
        if (!Number.isFinite(index) || index < 0) {
            return res.status(400).json({ message: "Invalid document index." });
        }

        const uploads = await getFolderUploads(caseNo, type);
        if (!Array.isArray(uploads) || index >= uploads.length) {
            return res.status(404).json({ message: "Document not found." });
        }

        const raw = String(uploads[index] || "").trim();
        if (!raw) {
            return res.status(404).json({ message: "Document is empty." });
        }

        const parsed = parseDataUrl(raw);
        const fileName = buildDocumentFileName(caseNo, type, index, raw);

        if (parsed && parsed.buffer?.length) {
            res.setHeader("Content-Type", parsed.mime || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${safeFileName(fileName)}"`);
            return res.send(parsed.buffer);
        }

        const candidate = raw.replace(/^\/+|^uploads\//i, "");
        const filePath = path.resolve(UPLOADS_DIR, candidate);
        if (!filePath.startsWith(UPLOADS_DIR) || !fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found on server." });
        }

        return res.download(filePath, safeFileName(fileName));
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to download document." });
    }
};

function toUpper(value) {
    return String(value || "").trim().toUpperCase();
}

function toOptionalText(value) {
    const text = String(value || "").trim();
    return text ? text : null;
}

function normalizeCaseStep(value, fallback = "STEP") {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "STEP") return "STEP";
    if (raw === "FINISHED" || raw === "FINISHED_STEP" || raw === "FINISHED STEP") return "FINISHED";
    if (raw === "NEXT STEP" || raw === "NEXT_STEP" || raw === "NEXTSTEP") return "PLAINT_STEP";
    if (raw === "PLAINT STEP" || raw === "PLAINT_STEP" || raw === "PLAINTSTEP") return "PLAINT_STEP";
    if (raw === "ANSWER STEP" || raw === "ANSWER_STEP" || raw === "ANSWERSTEP") return "ANSWER_STEP";
    if (raw === "L/W STEP" || raw === "L_W_STEP" || raw === "LW STEP" || raw === "LW_STEP" || raw === "LWSTEP") return "LW_STEP";
    if (raw === "DUDGMENT STEP" || raw === "DUDGMENT_STEP" || raw === "DUDGMENTSTEP" || raw === "JUDGMENT STEP" || raw === "JUDGMENT_STEP" || raw === "JUDGMENTSTEP") return "DUDGMENT_STEP";
    return fallback;
}

function toCaseStatusLabel(stepValue) {
    const step = normalizeCaseStep(stepValue, "STEP");
    if (step === "FINISHED") return "Finished";
    if (step === "PLAINT_STEP") return "Plaint";
    if (step === "ANSWER_STEP") return "Answer";
    if (step === "LW_STEP") return "L/witnesses";
    if (step === "DUDGMENT_STEP") return "Dudgment";
    return "Step";
}

function caseStepRank(stepValue) {
    const step = normalizeCaseStep(stepValue, "STEP");
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

function toCaseNoKey(value) {
    return String(value || "").trim().toUpperCase();
}

function normalizeDateOnlyInput(value) {
    const text = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
    const parsed = new Date(`${text}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return text;
}

function sriLankaDateYmd() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Colombo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value || "1970";
    const month = parts.find((p) => p.type === "month")?.value || "01";
    const day = parts.find((p) => p.type === "day")?.value || "01";
    return `${year}-${month}-${day}`;
}

async function resolveCustomer(customerIdRaw, customerNameRaw) {
    const customerId = Number(customerIdRaw || 0);
    if (Number.isFinite(customerId) && customerId > 0) {
        const customer = await Customer.findByPk(customerId);
        if (customer) {
            return {
                customer_id: customer.id,
                customer_name: toUpper(customer.name),
            };
        }
    }
    const fallbackName = toUpper(customerNameRaw);
    if (!fallbackName) {
        throw new Error("Customer name is required.");
    }
    return { customer_id: null, customer_name: fallbackName };
}

function isClientValidationError(message) {
    const text = String(message || "").toLowerCase();
    if (!text) return false;
    return (
        text.includes("is required") ||
        text.includes("supports up to 1000 words") ||
        text.includes("selected court is not in saved courts") ||
        text.includes("selected lawyer is not in saved lawyers") ||
        text.includes("customer name is required")
    );
}

async function resolveCourtAndLawyer(courtRaw, lawyerRaw) {
    const court = toUpper(courtRaw);
    const attend_lawyer = toUpper(lawyerRaw);
    if (!court) {
        throw new Error("Court is required.");
    }
    if (!attend_lawyer) {
        throw new Error("Attend Lawyer is required.");
    }

    const [courtRow, lawyerRow] = await Promise.all([
        Court.findOne({
            where: where(fn("LOWER", col("name")), court.toLowerCase()),
        }),
        Lawyer.findOne({
            where: where(fn("LOWER", col("name")), attend_lawyer.toLowerCase()),
        }),
    ]);

    if (!courtRow) {
        throw new Error("Selected court is not in saved courts.");
    }
    if (!lawyerRow) {
        throw new Error("Selected lawyer is not in saved lawyers.");
    }

    return {
        court: String(courtRow.name || "").trim(),
        attend_lawyer: String(lawyerRow.name || "").trim(),
    };
}

async function isLatestCaseEntry(row) {
    const caseNo = String(row?.case_no || "").trim();
    if (!caseNo) return true;
    const step = normalizeCaseStep(row?.case_step, "STEP");
    const latest = await LegalCase.findOne({
        where: { case_no: caseNo, case_step: step },
        order: [["case_date", "DESC"], ["id", "DESC"]],
    });
    if (!latest) {
        const legacyLatest = await LegalCase.findOne({
            where: { case_no: caseNo },
            order: [["case_date", "DESC"], ["id", "DESC"]],
        });
        return Number(legacyLatest?.id || 0) === Number(row?.id || 0);
    }
    return Number(latest?.id || 0) === Number(row?.id || 0);
}

async function ensurePlaintEntryForCase(caseRowLike) {
    const caseId = Number(caseRowLike?.id || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) return null;

    const existing = await Plaint.findOne({
        where: { case_id: caseId },
        order: [["plaint_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;

    const plaint_date = String(caseRowLike?.case_date || "").trim() || sriLankaDateYmd();
    const created = await Plaint.create({
        plaint_date,
        case_id: caseId,
        customer_id: Number(caseRowLike?.customer_id || 0) > 0 ? Number(caseRowLike.customer_id) : null,
        customer_name: String(caseRowLike?.customer_name || "").trim(),
        case_no: String(caseRowLike?.case_no || "").trim(),
        court: String(caseRowLike?.court || "").trim(),
        attend_lawyer: String(caseRowLike?.attend_lawyer || "").trim(),
        plaint_step: "STEP",
        comment: toOptionalText(caseRowLike?.comment),
        upload_method: toOptionalText(caseRowLike?.upload_method),
        uploads_json: normalizeUploads(caseRowLike?.uploads_json),
        answer: null,
        witness_list: null,
        dudgement: null,
        finished: false,
        edit_enabled: false,
    });
    return created;
}

async function ensureAnswerEntryForCase(caseRowLike) {
    const caseId = Number(caseRowLike?.id || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) return null;

    const existing = await Answer.findOne({
        where: { case_id: caseId },
        order: [["answer_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;

    const answer_date = String(caseRowLike?.case_date || "").trim() || sriLankaDateYmd();
    const created = await Answer.create({
        answer_date,
        plaint_id: null,
        case_id: caseId,
        customer_id: Number(caseRowLike?.customer_id || 0) > 0 ? Number(caseRowLike.customer_id) : null,
        customer_name: String(caseRowLike?.customer_name || "").trim(),
        case_no: String(caseRowLike?.case_no || "").trim(),
        court: String(caseRowLike?.court || "").trim(),
        attend_lawyer: String(caseRowLike?.attend_lawyer || "").trim(),
        answer_step: "STEP",
        comment: toOptionalText(caseRowLike?.comment),
        upload_method: toOptionalText(caseRowLike?.upload_method),
        uploads_json: normalizeUploads(caseRowLike?.uploads_json),
        edit_enabled: false,
    });
    return created;
}

async function ensureWitnessEntryForCase(caseRowLike) {
    const caseId = Number(caseRowLike?.id || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) return null;

    const existing = await Witness.findOne({
        where: { case_id: caseId },
        order: [["witness_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;

    const answerEntry = await ensureAnswerEntryForCase(caseRowLike);
    const witness_date = String(caseRowLike?.case_date || "").trim() || sriLankaDateYmd();
    const created = await Witness.create({
        witness_date,
        answer_id: Number(answerEntry?.id || 0) > 0 ? Number(answerEntry.id) : null,
        case_id: caseId,
        customer_id: Number(caseRowLike?.customer_id || 0) > 0 ? Number(caseRowLike.customer_id) : null,
        customer_name: String(caseRowLike?.customer_name || "").trim(),
        case_no: String(caseRowLike?.case_no || "").trim(),
        court: String(caseRowLike?.court || "").trim(),
        attend_lawyer: String(caseRowLike?.attend_lawyer || "").trim(),
        witness_step: "STEP",
        witness_list: null,
        comment: toOptionalText(caseRowLike?.comment),
        upload_method: toOptionalText(caseRowLike?.upload_method),
        uploads_json: normalizeUploads(caseRowLike?.uploads_json),
        edit_enabled: false,
    });
    return created;
}

async function ensureJudgmentEntryForCase(caseRowLike) {
    const caseId = Number(caseRowLike?.id || 0);
    if (!Number.isFinite(caseId) || caseId <= 0) return null;

    const existing = await Judgment.findOne({
        where: { case_id: caseId },
        order: [["judgment_date", "DESC"], ["id", "DESC"]],
    });
    if (existing) return existing;

    const judgment_date = String(caseRowLike?.case_date || "").trim() || sriLankaDateYmd();
    const created = await Judgment.create({
        judgment_date,
        case_id: caseId,
        customer_id: Number(caseRowLike?.customer_id || 0) > 0 ? Number(caseRowLike.customer_id) : null,
        customer_name: String(caseRowLike?.customer_name || "").trim(),
        case_no: String(caseRowLike?.case_no || "").trim(),
        court: String(caseRowLike?.court || "").trim(),
        attend_lawyer: String(caseRowLike?.attend_lawyer || "").trim(),
        judgment_text: null,
        comment: toOptionalText(caseRowLike?.comment),
        upload_method: toOptionalText(caseRowLike?.upload_method),
        uploads_json: normalizeUploads(caseRowLike?.uploads_json),
        finished: false,
        edit_enabled: false,
    });
    return created;
}

async function applyCaseStepTransition(payload) {
    const step = normalizeCaseStep(payload?.case_step, "STEP");
    if (step === "PLAINT_STEP") {
        const plaintEntry = await ensurePlaintEntryForCase(payload);
        return {
            ...payload,
            moved_to_plaint: true,
            plaint_id: Number(plaintEntry?.id || 0) || null,
        };
    }
    if (step === "ANSWER_STEP") {
        const answerEntry = await ensureAnswerEntryForCase(payload);
        return {
            ...payload,
            moved_to_answer: true,
            answer_id: Number(answerEntry?.id || 0) || null,
        };
    }
    if (step === "LW_STEP") {
        const witnessEntry = await ensureWitnessEntryForCase(payload);
        return {
            ...payload,
            moved_to_witness: true,
            witness_id: Number(witnessEntry?.id || 0) || null,
        };
    }
    if (step === "DUDGMENT_STEP") {
        const judgmentEntry = await ensureJudgmentEntryForCase(payload);
        return {
            ...payload,
            moved_to_judgment: true,
            judgment_id: Number(judgmentEntry?.id || 0) || null,
        };
    }
    return payload;
}

exports.getCases = async (req, res) => {
    try {
        const q = String(req.query.q || "").trim();
        const step = normalizeCaseStep(req.query.step, "");
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
            where.case_step = step;
        }
        const rows = await LegalCase.findAll({
            where,
            include: [{ model: Customer, required: false, attributes: ["id", "name"] }],
            order: [["case_date", "DESC"], ["id", "DESC"]],
        });
        const caseIds = rows.map((row) => Number(row.id || 0)).filter((id) => Number.isFinite(id) && id > 0);
        const caseNos = rows
            .map((row) => String(row.case_no || "").trim())
            .filter(Boolean);
        const groupedCaseRows = caseNos.length
            ? await LegalCase.findAll({
                where: { case_no: caseNos },
                attributes: ["id", "case_no", "case_step", "case_date"],
                order: [["case_no", "ASC"], ["case_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const caseStatusByCaseNo = new Map();
        (Array.isArray(groupedCaseRows) ? groupedCaseRows : []).forEach((row) => {
            const key = String(row.case_no || "").trim().toUpperCase();
            if (!key) return;
            const incomingRank = caseStepRank(row.case_step);
            const current = caseStatusByCaseNo.get(key);
            if (!current || incomingRank > current.rank) {
                caseStatusByCaseNo.set(key, {
                    rank: incomingRank,
                    step: normalizeCaseStep(row.case_step, "STEP"),
                });
            }
        });
        const plaintRows = caseIds.length
            ? await Plaint.findAll({
                where: {
                    [Op.or]: [
                        { case_id: caseIds },
                        { case_no: caseNos },
                    ],
                },
                attributes: ["id", "case_id", "case_no", "plaint_date"],
                order: [["case_no", "ASC"], ["plaint_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const answerRows = (caseIds.length || caseNos.length)
            ? await Answer.findAll({
                where: {
                    [Op.or]: [
                        { case_id: caseIds },
                        { case_no: caseNos },
                    ],
                },
                attributes: ["id", "case_id", "case_no", "answer_date"],
                order: [["case_no", "ASC"], ["answer_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const witnessRows = (caseIds.length || caseNos.length)
            ? await Witness.findAll({
                where: {
                    [Op.or]: [
                        { case_id: caseIds },
                        { case_no: caseNos },
                    ],
                },
                attributes: ["id", "case_id", "case_no", "witness_date"],
                order: [["case_no", "ASC"], ["witness_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const judgmentRows = (caseIds.length || caseNos.length)
            ? await Judgment.findAll({
                where: {
                    [Op.or]: [
                        { case_id: caseIds },
                        { case_no: caseNos },
                    ],
                },
                attributes: ["id", "case_id", "case_no", "judgment_date"],
                order: [["case_no", "ASC"], ["judgment_date", "DESC"], ["id", "DESC"]],
                raw: true,
            })
            : [];
        const plaintCaseSet = new Set(
            (Array.isArray(plaintRows) ? plaintRows : [])
                .map((row) => Number(row.case_id || 0))
                .filter((id) => Number.isFinite(id) && id > 0)
        );
        const plaintCaseNoSet = new Set(
            (Array.isArray(plaintRows) ? plaintRows : [])
                .map((row) => String(row.case_no || "").trim().toUpperCase())
                .filter(Boolean)
        );
        const latestPlaintByCaseNo = new Map();
        (Array.isArray(plaintRows) ? plaintRows : []).forEach((row) => {
            const key = toCaseNoKey(row.case_no);
            if (!key || latestPlaintByCaseNo.has(key)) return;
            const id = Number(row.id || 0);
            if (Number.isFinite(id) && id > 0) {
                latestPlaintByCaseNo.set(key, id);
            }
        });
        const latestAnswerByCaseNo = new Map();
        (Array.isArray(answerRows) ? answerRows : []).forEach((row) => {
            const key = toCaseNoKey(row.case_no);
            if (!key || latestAnswerByCaseNo.has(key)) return;
            const id = Number(row.id || 0);
            if (Number.isFinite(id) && id > 0) {
                latestAnswerByCaseNo.set(key, id);
            }
        });
        const latestWitnessByCaseNo = new Map();
        (Array.isArray(witnessRows) ? witnessRows : []).forEach((row) => {
            const key = toCaseNoKey(row.case_no);
            if (!key || latestWitnessByCaseNo.has(key)) return;
            const id = Number(row.id || 0);
            if (Number.isFinite(id) && id > 0) {
                latestWitnessByCaseNo.set(key, id);
            }
        });
        const latestJudgmentByCaseNo = new Map();
        (Array.isArray(judgmentRows) ? judgmentRows : []).forEach((row) => {
            const key = toCaseNoKey(row.case_no);
            if (!key || latestJudgmentByCaseNo.has(key)) return;
            const id = Number(row.id || 0);
            if (Number.isFinite(id) && id > 0) {
                latestJudgmentByCaseNo.set(key, id);
            }
        });
        const seenCaseNos = new Set();
        const payload = rows.map((row) => {
            const plain = row.toJSON ? row.toJSON() : row;
            const caseNoKey = String(plain.case_no || "").trim().toUpperCase();
            const stepKey = normalizeCaseStep(plain.case_step, "STEP");
            const latestKey = `${caseNoKey}::${stepKey}`;
            const latest_case_no_entry = caseNoKey
                ? !seenCaseNos.has(latestKey)
                : true;
            if (caseNoKey) {
                seenCaseNos.add(latestKey);
            }
            return {
                ...plain,
                case_status_step: caseStatusByCaseNo.get(caseNoKey)?.step || normalizeCaseStep(plain.case_step, "STEP"),
                case_status_label: toCaseStatusLabel(caseStatusByCaseNo.get(caseNoKey)?.step || plain.case_step),
                plaint_created:
                    plaintCaseSet.has(Number(plain.id || 0))
                    || plaintCaseNoSet.has(caseNoKey),
                latest_plaint_id: latestPlaintByCaseNo.get(caseNoKey) || null,
                latest_answer_id: latestAnswerByCaseNo.get(caseNoKey) || null,
                latest_witness_id: latestWitnessByCaseNo.get(caseNoKey) || null,
                latest_judgment_id: latestJudgmentByCaseNo.get(caseNoKey) || null,
                latest_case_no_entry,
            };
        });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load cases." });
    }
};

exports.getCaseById = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid case id." });
        }
        const row = await LegalCase.findByPk(id, {
            include: [{ model: Customer, required: false, attributes: ["id", "name"] }],
        });
        if (!row) {
            return res.status(404).json({ message: "Case not found." });
        }
        const plain = row.toJSON ? row.toJSON() : row;
        const caseNo = String(plain.case_no || "").trim();
        if (!caseNo) {
            return res.json(plain);
        }
        const grouped = await LegalCase.findAll({
            where: { case_no: caseNo },
            attributes: ["case_step"],
            raw: true,
        });
        let bestStep = normalizeCaseStep(plain.case_step, "STEP");
        let bestRank = caseStepRank(bestStep);
        (Array.isArray(grouped) ? grouped : []).forEach((entry) => {
            const s = normalizeCaseStep(entry.case_step, "STEP");
            const r = caseStepRank(s);
            if (r > bestRank) {
                bestRank = r;
                bestStep = s;
            }
        });
        res.json({
            ...plain,
            case_status_step: bestStep,
            case_status_label: toCaseStatusLabel(bestStep),
        });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load case." });
    }
};

exports.getCalendarCases = async (req, res) => {
    try {
        const start = normalizeDateOnlyInput(req.query.start) || sriLankaDateYmd();
        const end = normalizeDateOnlyInput(req.query.end) || start;
        const where = {
            case_date: { [Op.between]: [start, end] },
        };
        const rows = await LegalCase.findAll({
            where,
            attributes: [
                "id",
                "case_no",
                "case_date",
                "customer_name",
                "court",
                "attend_lawyer",
                "case_step",
                "createdAt",
            ],
            order: [["case_date", "ASC"], ["id", "DESC"]],
        });
        const payload = (Array.isArray(rows) ? rows : []).map((row) => {
            const plain = row?.toJSON ? row.toJSON() : row;
            const step = normalizeCaseStep(plain.case_step, "STEP");
            return {
                id: Number(plain.id || 0),
                case_no: String(plain.case_no || "").trim(),
                case_date: String(plain.case_date || "").trim(),
                customer_name: String(plain.customer_name || "").trim(),
                court: String(plain.court || "").trim(),
                attend_lawyer: String(plain.attend_lawyer || "").trim(),
                case_step: step,
                case_status_label: toCaseStatusLabel(step),
                createdAt: plain.createdAt || null,
            };
        });
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load calendar cases." });
    }
};

exports.createCase = async (req, res) => {
    try {
        const case_no = toUpper(req.body.case_no);
        const case_date = String(req.body.case_date || "").trim() || sriLankaDateYmd();
        const next_date = String(req.body.next_date || "").trim() || null;
        const courtInput = req.body.court;
        const court_type = toOptionalText(req.body.court_type);
        const category = toOptionalText(req.body.category);
        const lawyerInput = req.body.attend_lawyer;
        const case_step = normalizeCaseStep(req.body.case_step, "STEP");
        const comment = toOptionalText(req.body.comment);
        const upload_method = toOptionalText(req.body.upload_method);
        const uploads_json = normalizeUploads(req.body.uploads_json || req.body.uploads);
        const edit_enabled = false;

        if (!case_no) return res.status(400).json({ message: "Case No is required." });
        const support = await resolveCourtAndLawyer(courtInput, lawyerInput);
        if (countWords(comment) > 1000) {
            return res.status(400).json({ message: "Comment supports up to 1000 words." });
        }

        const customer = await resolveCustomer(req.body.customer_id, req.body.customer_name);
        const created = await LegalCase.create({
            case_no,
            case_date,
            next_date,
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            court: support.court,
            court_type,
            category,
            attend_lawyer: support.attend_lawyer,
            case_step,
            comment,
            upload_method,
            uploads_json,
            edit_enabled,
        });

        let payload = created.toJSON ? created.toJSON() : created;
        payload = await applyCaseStepTransition(payload);
        res.status(201).json(payload);
    } catch (err) {
        const msg = err.message || "Failed to create case.";
        const code = isClientValidationError(msg) ? 400 : 500;
        res.status(code).json({ message: msg });
    }
};

exports.updateCase = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid case id." });
        }

        const row = await LegalCase.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Case not found." });
        }
        if (!(await isLatestCaseEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }

        const current = row.toJSON ? row.toJSON() : row;
        const dataFieldKeys = [
            "case_no",
            "case_date",
            "next_date",
            "customer_id",
            "customer_name",
            "court",
            "court_type",
            "category",
            "attend_lawyer",
            "case_step",
            "comment",
        ];
        const uploadFieldKeys = [
            "upload_method",
            "uploads_json",
            "uploads",
        ];
        const hasDataFieldInput = dataFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasUploadFieldInput = uploadFieldKeys.some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
        const hasAnyFieldInput = hasDataFieldInput || hasUploadFieldInput;

        const nextEditEnabled = parseBooleanInput(req.body.edit_enabled, Boolean(current.edit_enabled));
        if (!current.edit_enabled && hasDataFieldInput) {
            return res.status(403).json({ message: "Edit is locked. Only uploads can be changed." });
        }

        const updatePayload = { edit_enabled: nextEditEnabled };
        if (hasAnyFieldInput) {
            const case_no = toUpper(req.body.case_no || current.case_no);
            const case_date = String(req.body.case_date || "").trim() || current.case_date;
            const next_date = Object.prototype.hasOwnProperty.call(req.body, "next_date")
                ? (String(req.body.next_date || "").trim() || null)
                : current.next_date;
            const court = toUpper(req.body.court || current.court);
            const court_type = Object.prototype.hasOwnProperty.call(req.body, "court_type")
                ? toOptionalText(req.body.court_type)
                : current.court_type;
            const category = Object.prototype.hasOwnProperty.call(req.body, "category")
                ? toOptionalText(req.body.category)
                : current.category;
            const attend_lawyer = toUpper(req.body.attend_lawyer || current.attend_lawyer);
            const case_step = Object.prototype.hasOwnProperty.call(req.body, "case_step")
                ? normalizeCaseStep(req.body.case_step, normalizeCaseStep(current.case_step, "STEP"))
                : normalizeCaseStep(current.case_step, "STEP");
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

            if (current.edit_enabled || nextEditEnabled) {
                if (!case_no) return res.status(400).json({ message: "Case No is required." });
                const support = await resolveCourtAndLawyer(court, attend_lawyer);
                if (countWords(comment) > 1000) {
                    return res.status(400).json({ message: "Comment supports up to 1000 words." });
                }

                const customer = await resolveCustomer(
                    Object.prototype.hasOwnProperty.call(req.body, "customer_id") ? req.body.customer_id : current.customer_id,
                    Object.prototype.hasOwnProperty.call(req.body, "customer_name") ? req.body.customer_name : current.customer_name
                );
                updatePayload.case_no = case_no;
                updatePayload.case_date = case_date;
                updatePayload.next_date = next_date;
                updatePayload.customer_id = customer.customer_id;
                updatePayload.customer_name = customer.customer_name;
                updatePayload.court = support.court;
                updatePayload.court_type = court_type;
                updatePayload.category = category;
                updatePayload.attend_lawyer = support.attend_lawyer;
                updatePayload.case_step = case_step;
                updatePayload.comment = comment;
            }
            updatePayload.upload_method = upload_method;
            updatePayload.uploads_json = uploads_json;
        }

        const requestedDate = String(updatePayload.case_date || "").trim();
        const currentDate = String(current.case_date || "").trim();
        const shouldCreateNewEntry = Boolean(current.edit_enabled || nextEditEnabled)
            && hasDataFieldInput
            && requestedDate
            && currentDate
            && requestedDate !== currentDate;

        if (shouldCreateNewEntry) {
            const created = await LegalCase.create({
                case_no: updatePayload.case_no || current.case_no,
                case_date: updatePayload.case_date || current.case_date,
                next_date: Object.prototype.hasOwnProperty.call(updatePayload, "next_date")
                    ? updatePayload.next_date
                    : current.next_date,
                customer_id: Object.prototype.hasOwnProperty.call(updatePayload, "customer_id")
                    ? updatePayload.customer_id
                    : current.customer_id,
                customer_name: updatePayload.customer_name || current.customer_name,
                court: updatePayload.court || current.court,
                court_type: Object.prototype.hasOwnProperty.call(updatePayload, "court_type")
                    ? updatePayload.court_type
                    : current.court_type,
                category: Object.prototype.hasOwnProperty.call(updatePayload, "category")
                    ? updatePayload.category
                    : current.category,
                attend_lawyer: updatePayload.attend_lawyer || current.attend_lawyer,
                case_step: Object.prototype.hasOwnProperty.call(updatePayload, "case_step")
                    ? updatePayload.case_step
                    : normalizeCaseStep(current.case_step, "STEP"),
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
            let payload = created.toJSON ? created.toJSON() : created;
            payload = await applyCaseStepTransition(payload);
            return res.status(201).json({
                ...payload,
                created_as_new: true,
                cloned_from_case_id: current.id,
                message: "Case date changed. New case entry created and original kept.",
            });
        }

        await row.update(updatePayload);
        const updated = row.toJSON ? row.toJSON() : row;
        const transitioned = await applyCaseStepTransition(updated);
        res.json(transitioned);
    } catch (err) {
        const msg = err.message || "Failed to update case.";
        const code = isClientValidationError(msg) ? 400 : 500;
        res.status(code).json({ message: msg });
    }
};

exports.deleteCase = async (req, res) => {
    try {
        const id = Number(req.params.id || 0);
        if (!Number.isFinite(id) || id <= 0) {
            return res.status(400).json({ message: "Invalid case id." });
        }
        const row = await LegalCase.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: "Case not found." });
        }
        if (!(await isLatestCaseEntry(row))) {
            return res.status(403).json({ message: "Edit latest entry only for this case no." });
        }
        if (!row.edit_enabled) {
            return res.status(403).json({ message: "Edit is locked. Tick Edit checkbox first." });
        }
        await row.destroy();
        res.json({ message: "Case deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete case." });
    }
};

exports.getCaseFolders = async (req, res) => {
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
        const caseRows = await LegalCase.findAll({
            where,
            attributes: ["id", "case_no", "case_step", "customer_name", "court", "attend_lawyer", "uploads_json"],
            order: [["case_no", "ASC"], ["case_date", "DESC"], ["id", "DESC"]],
            raw: true,
        });
        const caseNos = [...new Set(caseRows.map(row => String(row.case_no || "").trim()).filter(Boolean))];
        const plaintRows = caseNos.length ? await Plaint.findAll({
            where: { case_no: caseNos },
            attributes: ["id", "case_no", "uploads_json"],
            order: [["case_no", "ASC"], ["plaint_date", "DESC"], ["id", "DESC"]],
            raw: true,
        }) : [];
        const answerRows = caseNos.length ? await Answer.findAll({
            where: { case_no: caseNos },
            attributes: ["id", "case_no", "uploads_json"],
            order: [["case_no", "ASC"], ["answer_date", "DESC"], ["id", "DESC"]],
            raw: true,
        }) : [];
        const witnessRows = caseNos.length ? await Witness.findAll({
            where: { case_no: caseNos },
            attributes: ["id", "case_no", "uploads_json"],
            order: [["case_no", "ASC"], ["witness_date", "DESC"], ["id", "DESC"]],
            raw: true,
        }) : [];
        const judgmentRows = caseNos.length ? await Judgment.findAll({
            where: { case_no: caseNos },
            attributes: ["id", "case_no", "uploads_json"],
            order: [["case_no", "ASC"], ["judgment_date", "DESC"], ["id", "DESC"]],
            raw: true,
        }) : [];

        const caseMap = new Map();
        caseRows.forEach(row => {
            const caseNo = String(row.case_no || "").trim();
            if (!caseNo) return;
            if (!caseMap.has(caseNo)) {
                caseMap.set(caseNo, {
                    case_no: caseNo,
                    customer_name: row.customer_name,
                    court: row.court,
                    attend_lawyer: row.attend_lawyer,
                    subfolders: []
                });
            }
            const caseData = caseMap.get(caseNo);
            if (normalizeCaseStep(row.case_step) === "STEP" && Array.isArray(row.uploads_json) && row.uploads_json.length > 0) {
                if (!caseData.subfolders.some(f => f.type === "step")) {
                    caseData.subfolders.push({ type: "step", has_uploads: true });
                }
            }
        });

        const addSubfolder = (rows, type) => {
            rows.forEach(row => {
                const caseNo = String(row.case_no || "").trim();
                if (!caseNo || !caseMap.has(caseNo)) return;
                const caseData = caseMap.get(caseNo);
                if (Array.isArray(row.uploads_json) && row.uploads_json.length > 0) {
                    if (!caseData.subfolders.some(f => f.type === type)) {
                        caseData.subfolders.push({ type, has_uploads: true });
                    }
                }
            });
        };

        addSubfolder(plaintRows, "plaint");
        addSubfolder(answerRows, "answer");
        addSubfolder(witnessRows, "witness");
        addSubfolder(judgmentRows, "judgment");

        const payload = Array.from(caseMap.values());
        res.json(payload);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load case folders." });
    }
};

exports.getFolderDocuments = async (req, res) => {
    try {
        const caseNo = String(req.query.case_no || "").trim();
        const type = String(req.query.type || "").trim().toLowerCase();
        if (!caseNo) {
            return res.status(400).json({ message: "Case no is required." });
        }
        if (!["step", "plaint", "answer", "witness", "judgment"].includes(type)) {
            return res.status(400).json({ message: "Invalid type." });
        }
        let uploads = [];
        if (type === "step") {
            const rows = await LegalCase.findAll({
                where: { case_no: caseNo, case_step: "STEP" },
                attributes: ["uploads_json"],
                order: [["case_date", "DESC"], ["id", "DESC"]],
                raw: true,
            });
            rows.forEach(row => {
                if (Array.isArray(row.uploads_json)) {
                    uploads = uploads.concat(row.uploads_json);
                }
            });
        } else {
            const Model = type === "plaint" ? Plaint : type === "answer" ? Answer : type === "witness" ? Witness : Judgment;
            const dateField = type === "plaint" ? "plaint_date" : type === "answer" ? "answer_date" : type === "witness" ? "witness_date" : "judgment_date";
            const rows = await Model.findAll({
                where: { case_no: caseNo },
                attributes: ["uploads_json"],
                order: [[dateField, "DESC"], ["id", "DESC"]],
                raw: true,
            });
            rows.forEach(row => {
                if (Array.isArray(row.uploads_json)) {
                    uploads = uploads.concat(row.uploads_json);
                }
            });
        }
        // Remove duplicates if any
        const uniqueUploads = [...new Set(uploads)];
        res.json(uniqueUploads);
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to load documents." });
    }
};
