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

async function toggleDocuments(subDiv, caseNo, type) {
    const docsEl = subDiv.querySelector(".documents-list");
    if (docsEl.style.display === "block") {
        docsEl.style.display = "none";
    } else {
        docsEl.innerHTML = "<p>Loading...</p>";
        try {
            const documents = await request(`/cases/folder-documents?case_no=${encodeURIComponent(caseNo)}&type=${type}`, "GET");
            docsEl.innerHTML = "";
            (Array.isArray(documents) ? documents : []).forEach((doc) => {
                const docDiv = document.createElement("div");
                docDiv.classList.add("document-item");
                docDiv.innerHTML = `
                    <a href="/uploads/${doc}" target="_blank">${doc}</a>
                    <button class="download-btn" onclick="downloadFile('${doc}')">Download</button>
                `;
                docsEl.appendChild(docDiv);
            });
        } catch (err) {
            docsEl.innerHTML = "<p>Error loading documents.</p>";
        }
        docsEl.style.display = "block";
    }
}

function downloadFile(filename) {
    const link = document.createElement("a");
    link.href = `/uploads/${filename}`;
    link.download = filename;
    link.click();
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


