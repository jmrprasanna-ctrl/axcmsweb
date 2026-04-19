const witnessFormEl = document.getElementById("witnessForm");
const witnessIdEl = document.getElementById("witnessId");
const witnessDateEl = document.getElementById("witness_date");
const caseSearchEl = document.getElementById("case_search");
const customerNameEl = document.getElementById("customer_name");
const caseNoEl = document.getElementById("case_no");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const witnessListEl = document.getElementById("witness_list");
const witnessStepEl = document.getElementById("witness_step");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const deleteWitnessBtnEl = document.getElementById("deleteWitnessBtn");
const editEnabledEl = document.getElementById("edit_enabled");
const saveWitnessBtnEl = witnessFormEl ? witnessFormEl.querySelector("button[type='submit']") : null;
let cachedUploads = [];
let isEditEnabled = false;
let isSubmitting = false;

function countWords(value) {
    const text = String(value || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

function refreshCommentWordHint() {
    const n = countWords(commentEl?.value || "");
    if (commentWordEl) commentWordEl.innerText = `${n}/1000 words`;
}

function createClientRequestId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function setSavePendingState(pending) {
    if (!saveWitnessBtnEl) return;
    saveWitnessBtnEl.disabled = Boolean(pending);
    saveWitnessBtnEl.setAttribute("aria-disabled", pending ? "true" : "false");
    saveWitnessBtnEl.classList.toggle("is-disabled", Boolean(pending));
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
        witnessDateEl,
        witnessListEl,
        witnessStepEl,
        commentEl,
    ];
    fields.forEach((el) => {
        if (!el) return;
        el.disabled = locked;
    });
    if (deleteWitnessBtnEl) {
        deleteWitnessBtnEl.disabled = locked;
        deleteWitnessBtnEl.setAttribute("aria-disabled", locked ? "true" : "false");
        deleteWitnessBtnEl.classList.toggle("is-disabled", locked);
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
        img.alt = "witness upload";
        uploadPreviewEl.appendChild(img);
    });
}

async function loadWitnessForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
        window.location.href = "witness-list.html";
        return;
    }
    const row = await request(`/witnesses/${id}`, "GET");
    witnessIdEl.value = row.id;
    witnessDateEl.value = row.witness_date || "";
    caseSearchEl.value = `${row.case_no || ""} - ${row.customer_name || ""}`;
    customerNameEl.value = row.customer_name || "";
    caseNoEl.value = row.case_no || "";
    courtEl.value = row.court || "";
    lawyerEl.value = row.attend_lawyer || "";
    witnessListEl.value = row.witness_list || "";
    if (witnessStepEl) {
        witnessStepEl.value = String(row.witness_step || "STEP").toUpperCase() === "NEXT_STEP" ? "NEXT_STEP" : "STEP";
    }
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

if (witnessDateEl && !witnessDateEl.value) {
    witnessDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (editEnabledEl) {
    editEnabledEl.addEventListener("change", async () => {
        const id = Number(witnessIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            editEnabledEl.checked = isEditEnabled;
            return;
        }
        const nextValue = Boolean(editEnabledEl.checked);
        try {
            await request(`/witnesses/${id}`, "PUT", { edit_enabled: nextValue });
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

if (witnessFormEl) {
    witnessFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        const id = Number(witnessIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid witness entry.");
            return;
        }
        const payload = isEditEnabled
            ? {
                witness_date: witnessDateEl.value,
                witness_list: String(witnessListEl?.value || "").trim(),
                witness_step: witnessStepEl?.value || "STEP",
                comment: String(commentEl?.value || "").trim(),
                upload_method: uploadMethodEl?.value || null,
                uploads_json: cachedUploads,
                edit_enabled: true,
                client_request_id: createClientRequestId(),
            }
            : {
                upload_method: uploadMethodEl?.value || null,
                uploads_json: cachedUploads,
                edit_enabled: false,
                client_request_id: createClientRequestId(),
            };
        if (isEditEnabled && countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        isSubmitting = true;
        setSavePendingState(true);
        try {
            const result = await request(`/witnesses/${id}`, "PUT", payload);
            const savedCaseId = Number(result?.case_id || 0);
            const movedToNextStep = isEditEnabled && String(payload.witness_step || "STEP").toUpperCase() === "NEXT_STEP";
            if (result && result.created_as_new) {
                showMessageBox("New witness entry created.");
                if (movedToNextStep && Number.isFinite(savedCaseId) && savedCaseId > 0) {
                    setTimeout(() => {
                        window.location.href = `judgment-create.html?case_id=${savedCaseId}`;
                    }, 300);
                    return;
                }
                setTimeout(() => {
                    window.location.href = "witness-list.html";
                }, 300);
                return;
            }
            if (movedToNextStep && Number.isFinite(savedCaseId) && savedCaseId > 0) {
                showMessageBox("L/witnesses moved to Dugement step.");
                setTimeout(() => {
                    window.location.href = `judgment-create.html?case_id=${savedCaseId}`;
                }, 250);
                return;
            }
            showMessageBox(isEditEnabled ? "List of witnesses updated." : "Uploads updated.");
        } catch (err) {
            alert(err.message || "Failed to update witness record.");
        } finally {
            isSubmitting = false;
            setSavePendingState(false);
        }
    });
}

if (deleteWitnessBtnEl) {
    deleteWitnessBtnEl.addEventListener("click", async () => {
        const id = Number(witnessIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid witness entry.");
            return;
        }
        if (!isEditEnabled) {
            alert("Tick Edit checkbox to delete this witness.");
            return;
        }
        if (!confirm("Delete this witness entry?")) {
            return;
        }
        try {
            await request(`/witnesses/${id}`, "DELETE");
            showMessageBox("List of witnesses deleted.");
            setTimeout(() => {
                window.location.href = "witness-list.html";
            }, 250);
        } catch (err) {
            alert(err.message || "Failed to delete witness record.");
        }
    });
}

(async function init() {
    try {
        await loadWitnessForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize witness edit page.");
    }
})();
