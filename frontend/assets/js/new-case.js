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
const commentEl = document.getElementById("comment");
const commentWordEl = document.getElementById("commentWords");
const cameraUploadBtnEl = document.getElementById("cameraUploadBtn");
const folderUploadBtnEl = document.getElementById("folderUploadBtn");
const cameraUploadInputEl = document.getElementById("camera_uploads");
const folderUploadInputEl = document.getElementById("folder_uploads");
const uploadPreviewEl = document.getElementById("uploadPreview");
const formTitleEl = document.getElementById("formTitle");
const saveBtnEl = document.getElementById("saveCaseBtn");
let allCustomers = [];
let cachedUploads = [];
let selectedUploadMethod = "folder";

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

function localDateYmd() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

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

function getDataUrlMime(value) {
    const match = String(value || "").match(/^data:([^;]+);base64,/i);
    return match ? String(match[1] || "").toLowerCase() : "";
}

function isImageDataUrl(value) {
    return getDataUrlMime(value).startsWith("image/");
}

function shortMimeLabel(value) {
    const mime = getDataUrlMime(value);
    if (!mime) return "FILE";
    if (mime === "application/pdf") return "PDF";
    if (mime.includes("word")) return "DOC";
    if (mime.includes("sheet") || mime.includes("excel")) return "XLS";
    if (mime.startsWith("image/")) return "IMAGE";
    if (mime.startsWith("text/")) return "TEXT";
    return "FILE";
}

function renderUploadPreview(values) {
    if (!uploadPreviewEl) return;
    uploadPreviewEl.innerHTML = "";
    (Array.isArray(values) ? values : []).forEach((src) => {
        if (isImageDataUrl(src)) {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "case upload";
            uploadPreviewEl.appendChild(img);
            return;
        }
        const fileCard = document.createElement("div");
        fileCard.className = "upload-file-card";
        fileCard.innerHTML = `
            <div class="upload-file-icon">${shortMimeLabel(src)}</div>
            <div class="upload-file-text">Attached file</div>
        `;
        uploadPreviewEl.appendChild(fileCard);
    });
}

function mergeUploads(nextUploads) {
    const list = Array.isArray(nextUploads) ? nextUploads : [];
    cachedUploads = [...cachedUploads, ...list].slice(0, 20);
    renderUploadPreview(cachedUploads);
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
    allCustomers = await request("/customers", "GET");
    renderCustomerOptions(allCustomers);
}

async function loadCaseForEdit() {
    const id = Number(new URLSearchParams(window.location.search).get("id") || 0);
    if (!Number.isFinite(id) || id <= 0) return;
    const row = await request(`/cases/${id}`, "GET");
    if (formTitleEl) formTitleEl.innerText = "Edit Case";
    if (saveBtnEl) saveBtnEl.innerText = "Update Case";
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
    commentEl.value = row.comment || "";
    selectedUploadMethod = String(row.upload_method || "folder").toLowerCase().includes("camera") ? "camera" : "folder";
    cachedUploads = Array.isArray(row.uploads_json) ? row.uploads_json : [];
    renderUploadPreview(cachedUploads);
    refreshCommentWordHint();
}

if (caseDateEl && !caseDateEl.value) {
    caseDateEl.value = localDateYmd();
}
refreshCommentWordHint();

if (commentEl) commentEl.addEventListener("input", refreshCommentWordHint);
if (customerSearchEl) customerSearchEl.addEventListener("input", syncCustomerIdFromSearch);
if (courtTypeEl) {
    courtTypeEl.addEventListener("change", () => {
        syncCategoryOptions(courtTypeEl.value || "", "");
    });
}
if (cameraUploadBtnEl && cameraUploadInputEl) {
    cameraUploadBtnEl.addEventListener("click", () => {
        cameraUploadInputEl.click();
    });
}
if (folderUploadBtnEl && folderUploadInputEl) {
    folderUploadBtnEl.addEventListener("click", () => {
        folderUploadInputEl.click();
    });
}
if (cameraUploadInputEl) {
    cameraUploadInputEl.addEventListener("change", async () => {
        const rows = await filesToBase64(cameraUploadInputEl.files);
        selectedUploadMethod = "camera";
        mergeUploads(rows);
        cameraUploadInputEl.value = "";
    });
}
if (folderUploadInputEl) {
    folderUploadInputEl.addEventListener("change", async () => {
        const rows = await filesToBase64(folderUploadInputEl.files);
        selectedUploadMethod = "folder";
        mergeUploads(rows);
        folderUploadInputEl.value = "";
    });
}

if (caseFormEl) {
    caseFormEl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            case_date: caseDateEl.value,
            case_no: caseNoEl.value.trim(),
            customer_id: customerIdEl.value ? Number(customerIdEl.value) : null,
            customer_name: customerSearchEl.value.trim(),
            court_type: courtTypeEl?.value || null,
            category: categoryEl?.value || null,
            court: courtEl.value.trim(),
            attend_lawyer: lawyerEl.value.trim(),
            comment: commentEl.value.trim(),
            upload_method: selectedUploadMethod,
            uploads_json: cachedUploads,
        };
        if (countWords(payload.comment) > 1000) {
            alert("Comment supports up to 1000 words.");
            return;
        }
        try {
            const existingId = Number(caseIdEl.value || 0);
            if (Number.isFinite(existingId) && existingId > 0) {
                await request(`/cases/${existingId}`, "PUT", payload);
                showMessageBox("Case updated.");
            } else {
                await request("/cases", "POST", payload);
                showMessageBox("Case created.");
                caseFormEl.reset();
                caseDateEl.value = localDateYmd();
                cachedUploads = [];
                selectedUploadMethod = "folder";
                renderUploadPreview(cachedUploads);
                syncCategoryOptions("", "");
                refreshCommentWordHint();
            }
        } catch (err) {
            alert(err.message || "Failed to save case.");
        }
    });
}

(async function init() {
    try {
        syncCategoryOptions(courtTypeEl?.value || "", "");
        await loadCustomers();
        await loadCaseForEdit();
    } catch (err) {
        alert(err.message || "Failed to initialize case form.");
    }
})();
