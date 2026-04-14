const caseSearchEl = document.getElementById("caseSearch");
const foldersContainerEl = document.getElementById("foldersContainer");
const newCaseBtnEl = document.getElementById("newCaseBtn");
let allCases = [];

function normalizeStep(value) {
    return String(value || "").trim().toUpperCase();
}

function renderFolders(cases) {
    foldersContainerEl.innerHTML = "";
    (Array.isArray(cases) ? cases : []).forEach((caseData) => {
        const caseDiv = document.createElement("div");
        caseDiv.classList.add("case-folder");
        caseDiv.innerHTML = `
            <div class="folder-icon">📁</div>
            <h3>${caseData.case_no || ""}</h3>
            <p>${caseData.customer_name || ""}</p>
            <div class="subfolders" style="display: none;"></div>
        `;
        caseDiv.addEventListener("click", () => toggleSubfolders(caseDiv, caseData));
        foldersContainerEl.appendChild(caseDiv);
    });
}

function toggleSubfolders(caseDiv, caseData) {
    const subfoldersEl = caseDiv.querySelector(".subfolders");
    if (subfoldersEl.style.display === "grid") {
        subfoldersEl.style.display = "none";
    } else {
        subfoldersEl.innerHTML = "";
        (Array.isArray(caseData.subfolders) ? caseData.subfolders : []).forEach((sub) => {
            const subDiv = document.createElement("div");
            subDiv.classList.add("subfolder");
            subDiv.innerHTML = `
                <div class="subfolder-icon">📂</div>
                <span>${sub.type.charAt(0).toUpperCase() + sub.type.slice(1)}</span>
                <div class="documents-list" style="display: none;"></div>
            `;
            subDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                toggleDocuments(subDiv, caseData.case_no, sub.type);
            });
            subfoldersEl.appendChild(subDiv);
        });
        subfoldersEl.style.display = "grid";
    }
}

function formatDocumentLabel(doc, index) {
    const raw = String(doc || "").trim();
    if (/^data:/i.test(raw)) {
        return `Attachment ${index + 1}`;
    }
    return raw || `Attachment ${index + 1}`;
}

async function toggleDocuments(subDiv, caseNo, type) {
    const docsEl = subDiv.querySelector(".documents-list");
    if (docsEl.style.display === "block") {
        docsEl.style.display = "none";
    } else {
        docsEl.innerHTML = "<p>Loading...</p>";
        try {
            const documents = await request(`/cases/folder-documents?case_no=${encodeURIComponent(caseNo)}&type=${type}`, "GET");
            docsEl.innerHTML = "";
            (Array.isArray(documents) ? documents : []).forEach((doc, index) => {
                const docDiv = document.createElement("div");
                docDiv.classList.add("document-item");

                const label = document.createElement("span");
                label.textContent = formatDocumentLabel(doc, index);
                label.className = "document-name";

                const downloadBtn = document.createElement("button");
                downloadBtn.className = "download-btn";
                downloadBtn.type = "button";
                downloadBtn.textContent = "Download";
                downloadBtn.addEventListener("click", () => {
                    downloadFile(caseNo, type, index, formatDocumentLabel(doc, index));
                });

                docDiv.appendChild(label);
                docDiv.appendChild(downloadBtn);
                docsEl.appendChild(docDiv);
            });
        } catch (err) {
            docsEl.innerHTML = "<p>Error loading documents.</p>";
        }
        docsEl.style.display = "block";
    }
}

function downloadFile(caseNo, type, index, fileName) {
    const link = document.createElement("a");
    link.href = `/api/cases/download-document?case_no=${encodeURIComponent(caseNo)}&type=${encodeURIComponent(type)}&index=${encodeURIComponent(index)}`;
    link.download = String(fileName || "");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function applyFilter() {
    const q = String(caseSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderFolders(allCases);
        return;
    }
    const filtered = allCases.filter((caseData) => {
        return [caseData.case_no, caseData.customer_name, caseData.court, caseData.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q));
    });
    renderFolders(filtered);
}

async function loadCases() {
    try {
        allCases = await request("/cases/folders", "GET");
        applyFilter();
    } catch (err) {
        alert(err.message || "Failed to load cases.");
    }
}

if (caseSearchEl) {
    caseSearchEl.addEventListener("input", applyFilter);
}
if (newCaseBtnEl) {
    newCaseBtnEl.addEventListener("click", () => {
        window.location.href = "new-case.html";
    });
}

loadCases();


