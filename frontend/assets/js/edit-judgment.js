const judgmentFormEl = document.getElementById("judgmentForm");
const judgmentIdEl = document.getElementById("judgmentId");
const judgmentDateEl = document.getElementById("judgment_date");
const caseSearchEl = document.getElementById("case_search");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const judgmentTextEl = document.getElementById("judgment_text");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const deleteJudgmentBtnEl = document.getElementById("deleteJudgmentBtn");
const editEnabledEl = document.getElementById("edit_enabled");
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

function hasWords(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    return text.split(/\s+/).filter(Boolean).length > 0;
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
        judgmentDateEl,
        judgmentTextEl,
        commentEl,
    ];
    fields.forEach((el) => {
        if (!el) return;
        el.disabled = locked;
    });
    if (deleteJudgmentBtnEl) {
        deleteJudgmentBtnEl.disabled = locked;
        deleteJudgmentBtnEl.setAttribute("aria-disabled", locked ? "true" : "false");
        deleteJudgmentBtnEl.classList.toggle("is-disabled", locked);
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
        img.alt = "dugement upload";
        uploadPreviewEl.appendChild(img);
    });
}

async function loadJudgmentForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
        window.location.href = "judgment-list.html";
        return;
    }
    const row = await request(`/judgments/${id}`, "GET");
    judgmentIdEl.value = row.id;
    judgmentDateEl.value = row.judgment_date || "";
    caseSearchEl.value = `${row.case_no || ""} - ${row.customer_name || ""}`;
    customerNameEl.value = row.customer_name || "";
    caseNoEl.value = row.case_no || "";
    courtEl.value = row.court || "";
    lawyerEl.value = row.attend_lawyer || "";
    judgmentTextEl.value = row.judgment_text || "";
    commentEl.value = row.comment || "";
    uploadMethodEl.value = row.upload_method || "local";
    cachedUploads = Array.isArray(row.uploads_json) ? row.uploads_json : [];
    isEditEnabled = false;
    if (editEnabledEl) editEnabledEl.checked = isEditEnabled;
    renderUploadPreview(cachedUploads);
    updateUploadInputMode();
    refreshCommentWordHint();
    setFormLockState();
    if (typeof renderCaseHistory === "function") {
        renderCaseHistory(row.case_no, "caseHistoryBody", row.case_id);
    }
}

if (judgmentDateEl && !judgmentDateEl.value) {
    judgmentDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (editEnabledEl) {
    editEnabledEl.addEventListener("change", async () => {
        const id = Number(judgmentIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            editEnabledEl.checked = isEditEnabled;
            return;
        }
        const nextValue = Boolean(editEnabledEl.checked);
        try {
            await request(`/judgments/${id}`, "PUT", { edit_enabled: nextValue });
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
updateUploadInputMode();
setFormLockState();

if (judgmentFormEl) {
    judgmentFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = Number(judgmentIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid dugement entry.");
            return;
        }
        const payload = isEditEnabled
            ? {
                judgment_date: judgmentDateEl.value,
                judgment_text: String(judgmentTextEl?.value || "").trim(),
                comment: String(commentEl?.value || "").trim(),
                upload_method: uploadMethodEl?.value || null,
                uploads_json: cachedUploads,
                finished: hasWords(judgmentTextEl?.value || ""),
                edit_enabled: true,
            }
            : {
                upload_method: uploadMethodEl?.value || null,
                uploads_json: cachedUploads,
                edit_enabled: false,
            };
        if (isEditEnabled && countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        try {
            const result = await request(`/judgments/${id}`, "PUT", payload);
            if (result && result.created_as_new) {
                showMessageBox("New dugement entry created.");
                setTimeout(() => {
                    window.location.href = "judgment-list.html";
                }, 300);
                return;
            }
            showMessageBox(isEditEnabled ? "Dugement updated." : "Uploads updated.");
        } catch (err) {
            alert(err.message || "Failed to update dugement.");
        }
    });
}

if (deleteJudgmentBtnEl) {
    deleteJudgmentBtnEl.addEventListener("click", async () => {
        const id = Number(judgmentIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid dugement entry.");
            return;
        }
        if (!isEditEnabled) {
            alert("Tick Edit checkbox to delete this dugement.");
            return;
        }
        if (!confirm("Delete this dugement entry?")) {
            return;
        }
        try {
            await request(`/judgments/${id}`, "DELETE");
            showMessageBox("Dugement deleted.");
            setTimeout(() => {
                window.location.href = "judgment-list.html";
            }, 250);
        } catch (err) {
            alert(err.message || "Failed to delete dugement.");
        }
    });
}

(async function init() {
    try {
        await loadJudgmentForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize dugement edit page.");
    }
})();
