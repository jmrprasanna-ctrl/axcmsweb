const answerFormEl = document.getElementById("answerForm");
const answerDateEl = document.getElementById("answer_date");
const caseSearchEl = document.getElementById("case_search");
const caseDatalistEl = document.getElementById("caseOptions");
const caseIdEl = document.getElementById("case_id");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
let allCases = [];
let cachedUploads = [];
let selectedPlaintId = null;

function countWords(value) {
    const text = String(value || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

function refreshCommentWordHint() {
    const n = countWords(commentEl?.value || "");
    if (commentWordEl) commentWordEl.innerText = `${n}/1000 words`;
}

function updateUploadInputMode() {
    if (!uploadInputEl || !uploadMethodEl) return;
    if (uploadMethodEl.value === "take-photo") {
        uploadInputEl.setAttribute("capture", "environment");
    } else {
        uploadInputEl.removeAttribute("capture");
    }
}

async function filesToBase64(files) {
    const rows = Array.from(files || []).slice(0, 20);
    const outputs = [];
    for (const f of rows) {
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });
        if (data) outputs.push(data);
    }
    return outputs;
}

function renderUploadPreview(values) {
    if (!uploadPreviewEl) return;
    uploadPreviewEl.innerHTML = "";
    (Array.isArray(values) ? values : []).forEach((src) => {
        const img = document.createElement("img");
        img.src = src;
        img.alt = "answer upload";
        uploadPreviewEl.appendChild(img);
    });
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
    allCases = await request("/cases?step=ANSWER_STEP", "GET");
    renderCaseOptions(allCases);
}

async function loadAnswerForEdit() {
    const params = new URLSearchParams(window.location.search);
    const queryCaseId = Number(params.get("case_id") || 0);
    const queryPlaintId = Number(params.get("plaint_id") || 0);
    selectedPlaintId = Number.isFinite(queryPlaintId) && queryPlaintId > 0 ? queryPlaintId : null;

    if (Number.isFinite(queryCaseId) && queryCaseId > 0) {
        const found = allCases.find((row) => Number(row.id) === queryCaseId);
        if (found) {
            caseSearchEl.value = `${found.case_no} - ${found.customer_name}`;
            applyCaseSelectionFromSearch();
        } else {
            try {
                const row = await request(`/cases/${queryCaseId}`, "GET");
                allCases = [row, ...allCases.filter((item) => Number(item.id) !== Number(row.id))];
                renderCaseOptions(allCases);
                caseSearchEl.value = `${row.case_no} - ${row.customer_name}`;
                applyCaseSelectionFromSearch();
            } catch (_err) {
                // Keep form usable even when query case cannot be fetched.
            }
        }
    }
}

if (answerDateEl && !answerDateEl.value) {
    answerDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
updateUploadInputMode();

if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (caseSearchEl) caseSearchEl.addEventListener("input", applyCaseSelectionFromSearch);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (uploadInputEl) {
    uploadInputEl.addEventListener("change", async () => {
        cachedUploads = await filesToBase64(uploadInputEl.files);
        renderUploadPreview(cachedUploads);
    });
}

if (answerFormEl) {
    answerFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!caseIdEl.value) {
            alert("Select a case first.");
            return;
        }
        const payload = {
            answer_date: answerDateEl.value,
            case_id: Number(caseIdEl.value),
            plaint_id: selectedPlaintId,
            comment: commentEl.value.trim(),
            upload_method: uploadMethodEl.value,
            uploads_json: cachedUploads,
        };
        if (countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        try {
            await request("/answers", "POST", payload);
            showMessageBox("Answer saved.");
            answerFormEl.reset();
            answerDateEl.value = new Date().toISOString().slice(0, 10);
            caseIdEl.value = "";
            customerNameEl.value = "";
            caseNoEl.value = "";
            courtEl.value = "";
            lawyerEl.value = "";
            cachedUploads = [];
            renderUploadPreview(cachedUploads);
            refreshCommentWordHint();
            updateUploadInputMode();
        } catch (err) {
            alert(err.message || "Failed to save answer.");
        }
    });
}

(async function init() {
    try {
        await loadCases();
        await loadAnswerForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize answer create page.");
    }
})();
