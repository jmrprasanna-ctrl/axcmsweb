const caseFormEl = document.getElementById("caseForm");
const caseIdEl = document.getElementById("caseId");
const caseDateEl = document.getElementById("case_date");
const caseNoEl = document.getElementById("case_no");
const customerSearchEl = document.getElementById("customer_search");
const customerIdEl = document.getElementById("customer_id");
const customerListEl = document.getElementById("customerOptions");
const courtTypeEl = document.getElementById("court_type");
const categoryEl = document.getElementById("category");
const courtEl = document.getElementById("court");
const lawyerEl = document.getElementById("attend_lawyer");
const caseStepEl = document.getElementById("case_step");
const nextDateEl = document.getElementById("next_date");
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const uploadMethodEl = document.getElementById("upload_method");
const uploadInputEl = document.getElementById("uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const deleteCaseBtnEl = document.getElementById("deleteCaseBtn");
const editEnabledEl = document.getElementById("edit_enabled");
let allCustomers = [];
let cachedUploads = [];
let isEditEnabled = false;

const COURT_CATEGORY_MAP = {
    "DC Court": [
        "Civil Disputes",
        "Family Law",
        "Testamentary Cases",
        "Property and Land Cases",
        "Guardianship",
        "Other Matters",
        "Appeals",
    ],
    "High Court": [
        "Criminal Jurisdiction",
        "Commercial High Court",
        "High Court of Civil Appeal",
        "Provincial High Court",
        "Admiralty Jurisdiction",
    ],
    "Supreme Court": [
        "FR Applications",
        "Final Appellate Jurisdiction",
        "Constitutional Matters",
        "Election Petitions",
        "Special Leave to Appeal",
        "Breach of Parliamentary Privileges",
        "Consultative Jurisdiction",
    ],
};

function syncCategoryOptions(selectedCourtType, selectedCategory) {
    if (!categoryEl) return;
    const categories = COURT_CATEGORY_MAP[String(selectedCourtType || "").trim()] || [];
    categoryEl.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = "Select Category";
    categoryEl.appendChild(first);
    categories.forEach((label) => {
        const opt = document.createElement("option");
        opt.value = label;
        opt.textContent = label;
        categoryEl.appendChild(opt);
    });
    if (selectedCategory && categories.includes(selectedCategory)) {
        categoryEl.value = selectedCategory;
    } else {
        categoryEl.value = "";
    }
}

function countWords(value) {
    const text = String(value || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

function refreshCommentWordHint() {
    const n = countWords(commentEl?.value || "");
    if (commentWordEl) {
        commentWordEl.innerText = `${n}/1000 words`;
    }
}

function updateUploadInputMode() {
    if (!uploadInputEl || !uploadMethodEl) return;
    if (uploadMethodEl.value === "take-photo") {
        uploadInputEl.setAttribute("capture", "environment");
    } else {
        uploadInputEl.removeAttribute("capture");
    }
}

function normalizeCaseStepUi(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "FINISHED" || raw === "FINISHED_STEP" || raw === "FINISHED STEP") {
        return "FINISHED";
    }
    if (raw === "NEXT STEP" || raw === "NEXT_STEP" || raw === "NEXTSTEP" || raw === "PLAINT STEP" || raw === "PLAINT_STEP") {
        return "PLAINT_STEP";
    }
    if (raw === "ANSWER STEP" || raw === "ANSWER_STEP") {
        return "ANSWER_STEP";
    }
    if (raw === "L/W STEP" || raw === "L_W_STEP" || raw === "LW STEP" || raw === "LW_STEP") {
        return "LW_STEP";
    }
    if (raw === "DUDGMENT STEP" || raw === "DUDGMENT_STEP" || raw === "JUDGMENT STEP" || raw === "JUDGMENT_STEP") {
        return "DUDGMENT_STEP";
    }
    return "STEP";
}

function resolveCaseStepTarget(stepValue) {
    const step = normalizeCaseStepUi(stepValue);
    if (step === "FINISHED") {
        return { path: "finished.html", message: "Case moved to Finished." };
    }
    if (step === "PLAINT_STEP") {
        return { path: "plaint.html", message: "Case moved to Plaint step." };
    }
    if (step === "ANSWER_STEP") {
        return { path: "answer.html", message: "Case moved to Answer step." };
    }
    if (step === "LW_STEP") {
        return { path: "witness-list.html", message: "Case moved to L/W step." };
    }
    if (step === "DUDGMENT_STEP") {
        return { path: "judgment-list.html", message: "Case moved to Dudgment step." };
    }
    return { path: "case-list.html", message: "Case updated." };
}

function setFormLockState() {
    const locked = !isEditEnabled;
    const fields = [
        caseDateEl,
        caseNoEl,
        customerSearchEl,
        courtTypeEl,
        categoryEl,
        courtEl,
        lawyerEl,
        caseStepEl,
        nextDateEl,
        commentEl,
    ];
    fields.forEach((el) => {
        if (!el) return;
        el.disabled = locked;
    });
    if (deleteCaseBtnEl) {
        deleteCaseBtnEl.disabled = locked;
        deleteCaseBtnEl.setAttribute("aria-disabled", locked ? "true" : "false");
        deleteCaseBtnEl.classList.toggle("is-disabled", locked);
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
        img.alt = "case upload";
        uploadPreviewEl.appendChild(img);
    });
}

function renderCustomerOptions(rows) {
    customerListEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const option = document.createElement("option");
        option.value = row.name || "";
        option.dataset.id = row.id;
        customerListEl.appendChild(option);
    });
}

function syncCustomerIdFromSearch() {
    const current = String(customerSearchEl?.value || "").trim().toUpperCase();
    const found = allCustomers.find((c) => String(c.name || "").trim().toUpperCase() === current);
    customerIdEl.value = found ? String(found.id) : "";
}

async function loadCustomers() {
    allCustomers = await request("/clients", "GET");
    renderCustomerOptions(allCustomers);
}

async function loadCaseForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) {
        window.location.href = "case-list.html";
        return;
    }
    const row = await request(`/cases/${id}`, "GET");
    caseIdEl.value = row.id;
    caseDateEl.value = row.case_date || "";
    caseNoEl.value = row.case_no || "";
    customerSearchEl.value = row.customer_name || "";
    customerIdEl.value = row.customer_id || "";
    if (courtTypeEl) {
        courtTypeEl.value = row.court_type || "";
    }
    syncCategoryOptions(courtTypeEl?.value || "", row.category || "");
    courtEl.value = row.court || "";
    lawyerEl.value = row.attend_lawyer || "";
    if (caseStepEl) {
        caseStepEl.value = normalizeCaseStepUi(row.case_status_step || row.case_step || "STEP");
    }
    if (nextDateEl) {
        nextDateEl.value = row.next_date || "";
    }
    commentEl.value = row.comment || "";
    uploadMethodEl.value = row.upload_method || "local";
    cachedUploads = Array.isArray(row.uploads_json) ? row.uploads_json : [];
    isEditEnabled = false;
    if (editEnabledEl) {
        editEnabledEl.checked = isEditEnabled;
    }
    renderUploadPreview(cachedUploads);
    refreshCommentWordHint();
    updateUploadInputMode();
    setFormLockState();
    if (typeof renderCaseHistory === "function") {
        renderCaseHistory(row.case_no, "caseHistoryBody", row.id);
    }
}

if (caseDateEl && !caseDateEl.value) {
    caseDateEl.value = new Date().toISOString().slice(0, 10);
}
refreshCommentWordHint();
updateUploadInputMode();
setFormLockState();

if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (uploadMethodEl) uploadMethodEl.addEventListener("change", updateUploadInputMode);
if (customerSearchEl) customerSearchEl.addEventListener("input", syncCustomerIdFromSearch);
if (courtTypeEl) {
    courtTypeEl.addEventListener("change", () => {
        syncCategoryOptions(courtTypeEl.value || "", "");
    });
}
if (editEnabledEl) {
    editEnabledEl.addEventListener("change", async () => {
        const id = Number(caseIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            editEnabledEl.checked = isEditEnabled;
            return;
        }
        const nextValue = Boolean(editEnabledEl.checked);
        try {
            await request(`/cases/${id}`, "PUT", { edit_enabled: nextValue });
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

if (caseFormEl) {
    caseFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = Number(caseIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid case entry.");
            return;
        }
        const payload = isEditEnabled
            ? {
                case_date: caseDateEl.value,
                case_no: caseNoEl.value.trim(),
                customer_id: customerIdEl.value ? Number(customerIdEl.value) : null,
                customer_name: customerSearchEl.value.trim(),
                court_type: courtTypeEl?.value || null,
                category: categoryEl?.value || null,
                court: courtEl.value.trim(),
                attend_lawyer: lawyerEl.value.trim(),
                case_step: caseStepEl?.value || "STEP",
                next_date: nextDateEl?.value || null,
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
        if (isEditEnabled && nextDateEl && String(nextDateEl.value || "").trim()) {
            payload.case_date = String(nextDateEl.value || "").trim();
            payload.next_date = null;
        }
        try {
            const result = await request(`/cases/${id}`, "PUT", payload);
            const isStepChangeFlow = isEditEnabled && normalizeCaseStepUi(payload.case_step || "STEP") !== "STEP";
            const stepTarget = resolveCaseStepTarget(payload.case_step || "STEP");
            if (result && result.created_as_new) {
                showMessageBox("New case entry created.");
                if (isStepChangeFlow) {
                    setTimeout(() => {
                        window.location.href = stepTarget.path;
                    }, 300);
                    return;
                }
                setTimeout(() => {
                    window.location.href = "case-list.html";
                }, 300);
                return;
            }
            if (isStepChangeFlow) {
                showMessageBox(stepTarget.message);
                setTimeout(() => {
                    window.location.href = stepTarget.path;
                }, 250);
                return;
            }
            showMessageBox(isEditEnabled ? "Case updated." : "Uploads updated.");
        } catch (err) {
            alert(err.message || "Failed to update case.");
        }
    });
}

if (deleteCaseBtnEl) {
    deleteCaseBtnEl.addEventListener("click", async () => {
        const id = Number(caseIdEl.value || 0);
        if (!Number.isFinite(id) || id <= 0) {
            alert("Invalid case entry.");
            return;
        }
        if (!isEditEnabled) {
            alert("Tick Edit checkbox to delete this case.");
            return;
        }
        if (!confirm("Delete this case entry?")) {
            return;
        }
        try {
            await request(`/cases/${id}`, "DELETE");
            showMessageBox("Case deleted.");
            setTimeout(() => {
                window.location.href = "case-list.html";
            }, 250);
        } catch (err) {
            alert(err.message || "Failed to delete case.");
        }
    });
}

(async function init() {
    try {
        syncCategoryOptions(courtTypeEl?.value || "", "");
        await loadCustomers();
        await loadCaseForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize case edit page.");
    }
})();
