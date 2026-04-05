const plaintFormEl = document.getElementById("plaintForm");
const plaintIdEl = document.getElementById("plaintId");
const plaintDateEl = document.getElementById("plaint_date");
const caseSearchEl = document.getElementById("case_search");
const caseDatalistEl = document.getElementById("caseOptions");
const caseIdEl = document.getElementById("case_id");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const plaintStepEl = document.getElementById("plaint_step");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const deletePlaintBtnEl = document.getElementById("deletePlaintBtn");
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
        plaintDateEl,
        caseSearchEl,
        plaintStepEl,
        commentEl,
    ];
    fields.forEach((el) => {
        if (!el) return;
        el.disabled = locked;
    });
    if (deletePlaintBtnEl) {
        deletePlaintBtnEl.disabled = locked;
        deletePlaintBtnEl.setAttribute("aria-disabled", locked ? "true" : "false");
        deletePlaintBtnEl.classList.toggle("is-disabled", locked);
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
        img.alt = "plaint upload";
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

async function loadPlaintForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
        window.location.href = "plaint.html";
        return;
    }
    const row = await request(`/plaints/${id}`, "GET");
    plaintIdEl.value = row.id;
    plaintDateEl.value = row.plaint_date || "";
    caseIdEl.value = row.case_id || "";
    customerNameEl.value = row.customer_name || "";
    caseNoEl.value = row.case_no || "";
    courtEl.value = row.court || "";
    lawyerEl.value = row.attend_lawyer || "";
    if (plaintStepEl) {
        const normalizedStep = String(row.plaint_step || "STEP").trim().toUpperCase();
        plaintStepEl.value = (normalizedStep === "ANSWER_STEP" || normalizedStep === "NEXT_STEP") ? "ANSWER_STEP" : "STEP";
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

if (plaintDateEl && !plaintDateEl.value) {
    plaintDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
updateUploadInputMode();
setFormLockState();

if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (caseSearchEl) caseSearchEl.addEventListener("input", applyCaseSelectionFromSearch);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (editEnabledEl) {
    editEnabledEl.addEventListener("change", async () => {
        const id = Number(plaintIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            editEnabledEl.checked = isEditEnabled;
            return;
        }
        const nextValue = Boolean(editEnabledEl.checked);
        try {
            await request(`/plaints/${id}`, "PUT", { edit_enabled: nextValue });
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

if (plaintFormEl) {
    plaintFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = Number(plaintIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid plaint entry.");
            return;
        }
        if (!caseIdEl.value && isEditEnabled) {
            alert("Select a case first.");
            return;
        }
        const payload = isEditEnabled
            ? {
                plaint_date: plaintDateEl.value,
                case_id: Number(caseIdEl.value),
                plaint_step: plaintStepEl?.value || "STEP",
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
            const result = await request(`/plaints/${id}`, "PUT", payload);
            const movedToAnswerStep = isEditEnabled && ["ANSWER_STEP", "NEXT_STEP"].includes(String(payload.plaint_step || "STEP").toUpperCase());
            if (result && result.created_as_new) {
                showMessageBox("New plaint entry created.");
                if (movedToAnswerStep) {
                    setTimeout(() => {
                        window.location.href = "answer.html";
                    }, 300);
                    return;
                }
                setTimeout(() => {
                    window.location.href = "plaint.html";
                }, 300);
                return;
            }
            if (movedToAnswerStep) {
                showMessageBox("Plaint moved to Answer step.");
                setTimeout(() => {
                    window.location.href = "answer.html";
                }, 250);
                return;
            }
            showMessageBox(isEditEnabled ? "Plaint updated." : "Uploads updated.");
        } catch (err) {
            alert(err.message || "Failed to update plaint.");
        }
    });
}

if (deletePlaintBtnEl) {
    deletePlaintBtnEl.addEventListener("click", async () => {
        const id = Number(plaintIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid plaint entry.");
            return;
        }
        if (!isEditEnabled) {
            alert("Tick Edit checkbox to delete this plaint.");
            return;
        }
        if (!confirm("Delete this plaint entry?")) {
            return;
        }
        try {
            await request(`/plaints/${id}`, "DELETE");
            showMessageBox("Plaint deleted.");
            setTimeout(() => {
                window.location.href = "plaint.html";
            }, 250);
        } catch (err) {
            alert(err.message || "Failed to delete plaint.");
        }
    });
}

(async function init() {
    try {
        await loadCases();
        await loadPlaintForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize plaint edit page.");
    }
})();
