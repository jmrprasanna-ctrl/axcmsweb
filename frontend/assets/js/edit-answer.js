const answerFormEl = document.getElementById("answerForm");
const answerIdEl = document.getElementById("answerId");
const answerDateEl = document.getElementById("answer_date");
const caseSearchEl = document.getElementById("case_search");
const caseDatalistEl = document.getElementById("caseOptions");
const caseIdEl = document.getElementById("case_id");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const answerStepEl = document.getElementById("answer_step");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const deleteAnswerBtnEl = document.getElementById("deleteAnswerBtn");
const editEnabledEl = document.getElementById("edit_enabled");
let allCases = [];
let cachedUploads = [];
let isEditEnabled = false;

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

function setFormLockState() {
    const locked = !isEditEnabled;
    const fields = [
        answerDateEl,
        caseSearchEl,
        answerStepEl,
        commentEl,
    ];
    fields.forEach((el) => {
        if (!el) return;
        el.disabled = locked;
    });
    if (deleteAnswerBtnEl) {
        deleteAnswerBtnEl.disabled = locked;
        deleteAnswerBtnEl.setAttribute("aria-disabled", locked ? "true" : "false");
        deleteAnswerBtnEl.classList.toggle("is-disabled", locked);
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
    allCases = await request("/cases", "GET");
    renderCaseOptions(allCases);
}

async function loadAnswerForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
        window.location.href = "answer.html";
        return;
    }

    const row = await request(`/answers/${id}`, "GET");
    answerIdEl.value = row.id;
    answerDateEl.value = row.answer_date || "";
    caseIdEl.value = row.case_id || "";
    customerNameEl.value = row.customer_name || "";
    caseNoEl.value = row.case_no || "";
    courtEl.value = row.court || "";
    lawyerEl.value = row.attend_lawyer || "";
    if (answerStepEl) {
        answerStepEl.value = String(row.answer_step || "STEP").toUpperCase() === "NEXT_STEP" ? "NEXT_STEP" : "STEP";
    }
    commentEl.value = row.comment || "";
    uploadMethodEl.value = row.upload_method || "local";
    cachedUploads = Array.isArray(row.uploads_json) ? row.uploads_json : [];
    isEditEnabled = false;
    if (editEnabledEl) editEnabledEl.checked = isEditEnabled;
    renderUploadPreview(cachedUploads);
    refreshCommentWordHint();
    updateUploadInputMode();
    setFormLockState();

    const found = allCases.find((c) => Number(c.id) === Number(row.case_id));
    if (found) {
        caseSearchEl.value = `${found.case_no} - ${found.customer_name}`;
    }
    if (typeof renderCaseHistory === "function") {
        renderCaseHistory(row.case_no, "caseHistoryBody", row.case_id);
    }
}

if (answerDateEl && !answerDateEl.value) {
    answerDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
updateUploadInputMode();
setFormLockState();

if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (caseSearchEl) caseSearchEl.addEventListener("input", applyCaseSelectionFromSearch);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (editEnabledEl) {
    editEnabledEl.addEventListener("change", async () => {
        const id = Number(answerIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            editEnabledEl.checked = isEditEnabled;
            return;
        }
        const nextValue = Boolean(editEnabledEl.checked);
        try {
            await request(`/answers/${id}`, "PUT", { edit_enabled: nextValue });
            isEditEnabled = nextValue;
            setFormLockState();
        } catch (err) {
            editEnabledEl.checked = isEditEnabled;
            alert(err.message || "Failed to change edit status.");
        }
    });
}
if (uploadInputEl) {
    uploadInputEl.addEventListener("change", async () => {
        cachedUploads = await filesToBase64(uploadInputEl.files);
        renderUploadPreview(cachedUploads);
    });
}

if (answerFormEl) {
    answerFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = Number(answerIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid answer entry.");
            return;
        }
        if (!caseIdEl.value && isEditEnabled) {
            alert("Select a case first.");
            return;
        }
        const payload = isEditEnabled
            ? {
                answer_date: answerDateEl.value,
                case_id: Number(caseIdEl.value),
                answer_step: answerStepEl?.value || "STEP",
                comment: commentEl.value.trim(),
                upload_method: uploadMethodEl.value,
                uploads_json: cachedUploads,
                edit_enabled: true,
            }
            : {
                upload_method: uploadMethodEl.value,
                uploads_json: cachedUploads,
                edit_enabled: false,
            };
        if (isEditEnabled && countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        try {
            const result = await request(`/answers/${id}`, "PUT", payload);
            const savedAnswerId = Number(result?.id || id);
            const savedCaseId = Number(result?.case_id || caseIdEl.value || 0);
            const movedToNextStep = isEditEnabled && String(payload.answer_step || "STEP").toUpperCase() === "NEXT_STEP";
            if (result && result.created_as_new) {
                showMessageBox("New answer entry created.");
                if (movedToNextStep) {
                    setTimeout(() => {
                        window.location.href = `witness-create.html?answer_id=${savedAnswerId}&case_id=${savedCaseId}`;
                    }, 300);
                    return;
                }
                setTimeout(() => {
                    window.location.href = "answer.html";
                }, 300);
                return;
            }
            if (movedToNextStep) {
                showMessageBox("Answer moved to L/witnesses step.");
                setTimeout(() => {
                    window.location.href = `witness-create.html?answer_id=${savedAnswerId}&case_id=${savedCaseId}`;
                }, 250);
                return;
            }
            showMessageBox(isEditEnabled ? "Answer updated." : "Uploads updated.");
        } catch (err) {
            alert(err.message || "Failed to update answer.");
        }
    });
}

if (deleteAnswerBtnEl) {
    deleteAnswerBtnEl.addEventListener("click", async () => {
        const id = Number(answerIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid answer entry.");
            return;
        }
        if (!isEditEnabled) {
            alert("Tick Edit checkbox to delete this answer.");
            return;
        }
        if (!confirm("Delete this answer entry?")) {
            return;
        }
        try {
            await request(`/answers/${id}`, "DELETE");
            showMessageBox("Answer deleted.");
            setTimeout(() => {
                window.location.href = "answer.html";
            }, 250);
        } catch (err) {
            alert(err.message || "Failed to delete answer.");
        }
    });
}

(async function init() {
    try {
        await loadCases();
        await loadAnswerForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize answer edit page.");
    }
})();
