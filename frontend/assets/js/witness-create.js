const witnessFormEl = document.getElementById("witnessForm");
const witnessDateEl = document.getElementById("witness_date");
const caseSearchEl = document.getElementById("case_search");
const caseDatalistEl = document.getElementById("caseOptions");
const caseIdEl = document.getElementById("case_id");
const answerIdEl = document.getElementById("answer_id");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const witnessListEl = document.getElementById("witness_list");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
let allCases = [];

function countWords(value) {
    const text = String(value || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

function refreshCommentWordHint() {
    const n = countWords(commentEl?.value || "");
    if (commentWordEl) commentWordEl.innerText = `${n}/1000 words`;
}

function renderCaseOptions(rows) {
    caseDatalistEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const option = document.createElement("option");
        option.value = `${row.case_no} - ${row.customer_name}`;
        option.dataset.id = row.id;
        caseDatalistEl.appendChild(option);
    });
}

function applyCaseSelectionFromSearch() {
    const selectedText = String(caseSearchEl?.value || "").trim();
    const found = allCases.find((row) => `${row.case_no} - ${row.customer_name}` === selectedText);
    if (!found) return;
    caseIdEl.value = String(found.id);
    customerNameEl.value = found.customer_name || "";
    caseNoEl.value = found.case_no || "";
    courtEl.value = found.court || "";
    lawyerEl.value = found.attend_lawyer || "";
}

async function loadCases() {
    allCases = await request("/cases", "GET");
    renderCaseOptions(allCases);
}

async function loadAnswerDefaults() {
    const params = new URLSearchParams(window.location.search);
    const answerId = Number(params.get("answer_id") || 0);
    const queryCaseId = Number(params.get("case_id") || 0);

    if (Number.isFinite(answerId) && answerId > 0) {
        answerIdEl.value = String(answerId);
        const answer = await request(`/answers/${answerId}`, "GET");
        caseIdEl.value = String(answer.case_id || "");
        customerNameEl.value = answer.customer_name || "";
        caseNoEl.value = answer.case_no || "";
        courtEl.value = answer.court || "";
        lawyerEl.value = answer.attend_lawyer || "";
        const matched = allCases.find((row) => Number(row.id) === Number(answer.case_id));
        if (matched) {
            caseSearchEl.value = `${matched.case_no} - ${matched.customer_name}`;
        }
        return;
    }

    if (Number.isFinite(queryCaseId) && queryCaseId > 0) {
        const found = allCases.find((row) => Number(row.id) === queryCaseId);
        if (found) {
            caseSearchEl.value = `${found.case_no} - ${found.customer_name}`;
            applyCaseSelectionFromSearch();
        }
    }
}

if (witnessDateEl && !witnessDateEl.value) {
    witnessDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (caseSearchEl) caseSearchEl.addEventListener("input", applyCaseSelectionFromSearch);

if (witnessFormEl) {
    witnessFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!caseIdEl.value) {
            alert("Select a case first.");
            return;
        }
        const payload = {
            witness_date: witnessDateEl.value,
            case_id: Number(caseIdEl.value),
            answer_id: answerIdEl.value ? Number(answerIdEl.value) : null,
            witness_list: String(witnessListEl?.value || "").trim(),
            comment: String(commentEl?.value || "").trim(),
        };
        if (countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        try {
            await request("/witnesses", "POST", payload);
            showMessageBox("List of witnesses saved.");
            setTimeout(() => {
                window.location.href = "witness-list.html";
            }, 220);
        } catch (err) {
            alert(err.message || "Failed to save witness record.");
        }
    });
}

(async function init() {
    try {
        await loadCases();
        await loadAnswerDefaults();
    } catch (err) {
        alert(err.message || "Failed to initialize witness create page.");
    }
})();
