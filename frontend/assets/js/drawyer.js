const drawyerSyncBtnEl = document.getElementById("drawyerSyncBtn");
const drawyerSearchEl = document.getElementById("drawyerSearch");
const drawyerFoldersContainerEl = document.getElementById("drawyerFoldersContainer");

let drawyerCases = [];
let requestedCaseNo = "";
let hasRequestedCaseMatch = false;

function normalizeModule(moduleName) {
    const key = String(moduleName || "").trim().toLowerCase();
    if (key === "case") return "step";
    if (key === "plaint") return "plaint";
    if (key === "answer") return "answer";
    if (key === "witness") return "witness";
    if (key === "judgment" || key === "dudgment") return "judgment";
    return key || "step";
}

function folderLabel(moduleName) {
    const type = normalizeModule(moduleName);
    if (type === "step") return "Step";
    if (type === "plaint") return "Plaint";
    if (type === "answer") return "Answer";
    if (type === "witness") return "L/Witnesses";
    if (type === "judgment") return "Dudgment";
    return String(moduleName || "Folder");
}

function folderIcon(moduleName) {
    const type = normalizeModule(moduleName);
    if (type === "plaint") return "PL";
    if (type === "answer") return "AN";
    if (type === "witness") return "WI";
    if (type === "judgment") return "JD";
    return "FD";
}

function formatDate(value) {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString();
}

function fileStatusClass(syncStatus) {
    return String(syncStatus || "").trim().toLowerCase() === "synced" ? "ok" : "pending";
}

function fileStatusLabel(syncStatus) {
    return String(syncStatus || "").trim().toLowerCase() === "synced" ? "Synced" : "Pending";
}

function buildFileDownloadUrl(file) {
    return `/api/drawyer/download?source_table=${encodeURIComponent(file.source_table || "")}&source_id=${encodeURIComponent(file.source_id || "")}&file_index=${encodeURIComponent(file.file_index || 0)}`;
}

function createDocumentItem(caseNo, moduleName, file) {
    const row = document.createElement("div");
    row.className = "drawyer-document-item";

    const left = document.createElement("div");
    left.className = "drawyer-document-left";

    const name = document.createElement("span");
    name.className = "drawyer-document-name";
    name.textContent = String(file?.file_name || "Attachment");
    left.appendChild(name);

    const meta = document.createElement("span");
    meta.className = "drawyer-document-meta";
    const dateText = formatDate(file?.updated_at);
    meta.textContent = dateText ? `${folderLabel(moduleName)} | ${dateText}` : folderLabel(moduleName);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "drawyer-document-actions";

    const status = document.createElement("span");
    status.className = `drawyer-file-status ${fileStatusClass(file?.sync_status)}`;
    status.textContent = fileStatusLabel(file?.sync_status);
    right.appendChild(status);

    if (String(file?.drive_web_view_link || "").trim()) {
        const openLink = document.createElement("a");
        openLink.href = String(file.drive_web_view_link);
        openLink.target = "_blank";
        openLink.rel = "noopener";
        openLink.className = "table-mini-btn link";
        openLink.textContent = "Open";
        right.appendChild(openLink);
    }

    const downloadBtn = document.createElement("button");
    downloadBtn.type = "button";
    downloadBtn.className = "table-mini-btn";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const link = document.createElement("a");
        link.href = buildFileDownloadUrl(file);
        link.download = String(file?.file_name || "");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    right.appendChild(downloadBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "table-mini-btn danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        if (!confirm("Delete this file permanently?")) return;
        try {
            await request(
                `/drawyer/delete-file?case_no=${encodeURIComponent(caseNo)}&module=${encodeURIComponent(moduleName)}&source_table=${encodeURIComponent(file.source_table || "")}&source_id=${encodeURIComponent(file.source_id || "")}&file_index=${encodeURIComponent(file.file_index || 0)}`,
                "DELETE",
                null
            );
            await loadDrawyer(false);
            if (typeof showMessageBox === "function") {
                showMessageBox("File deleted successfully.");
            } else {
                alert("File deleted successfully.");
            }
        } catch (err) {
            if (typeof showMessageBox === "function") {
                showMessageBox(err.message || "Failed to delete file.", "error");
            } else {
                alert(err.message || "Failed to delete file.");
            }
        }
    });
    right.appendChild(deleteBtn);

    row.appendChild(left);
    row.appendChild(right);
    return row;
}

function createSubfolder(caseNo, moduleName, files) {
    const wrapper = document.createElement("div");
    wrapper.className = "drawyer-subfolder";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "drawyer-subfolder-header";

    const icon = document.createElement("div");
    icon.className = "drawyer-subfolder-icon";
    icon.textContent = folderIcon(moduleName);
    header.appendChild(icon);

    const title = document.createElement("span");
    title.className = "drawyer-subfolder-title";
    title.textContent = folderLabel(moduleName);
    header.appendChild(title);

    const count = document.createElement("span");
    count.className = "drawyer-subfolder-count";
    count.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
    header.appendChild(count);

    const docs = document.createElement("div");
    docs.className = "drawyer-documents-list";
    docs.hidden = true;

    if (!files.length) {
        const empty = document.createElement("p");
        empty.className = "drawyer-empty";
        empty.textContent = "No files found.";
        docs.appendChild(empty);
    } else {
        files.forEach((file) => {
            docs.appendChild(createDocumentItem(caseNo, moduleName, file));
        });
    }

    header.addEventListener("click", (event) => {
        event.stopPropagation();
        docs.hidden = !docs.hidden;
        header.classList.toggle("expanded", !docs.hidden);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(docs);
    return wrapper;
}

function createCaseFolder(caseData) {
    const caseNo = String(caseData?.case_no || "").trim();
    const folders = caseData?.folders && typeof caseData.folders === "object" ? caseData.folders : {};
    const folderEntries = Object.entries(folders).filter((entry) => Array.isArray(entry[1]) && entry[1].length > 0);

    const card = document.createElement("div");
    card.className = "drawyer-case-folder";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "drawyer-case-header";

    const folderIconEl = document.createElement("div");
    folderIconEl.className = "drawyer-folder-icon";
    folderIconEl.textContent = "FD";
    header.appendChild(folderIconEl);

    const labelWrap = document.createElement("div");
    labelWrap.className = "drawyer-case-title-wrap";

    const title = document.createElement("h3");
    title.textContent = caseNo;
    labelWrap.appendChild(title);

    const meta = document.createElement("p");
    const fileCount = folderEntries.reduce((count, entry) => count + entry[1].length, 0);
    meta.textContent = `${folderEntries.length} folder${folderEntries.length === 1 ? "" : "s"} | ${fileCount} file${fileCount === 1 ? "" : "s"}`;
    labelWrap.appendChild(meta);

    header.appendChild(labelWrap);

    const subfolders = document.createElement("div");
    subfolders.className = "drawyer-subfolders";
    subfolders.hidden = true;

    folderEntries.forEach(([moduleName, files]) => {
        subfolders.appendChild(createSubfolder(caseNo, moduleName, files));
    });

    header.addEventListener("click", () => {
        subfolders.hidden = !subfolders.hidden;
        header.classList.toggle("expanded", !subfolders.hidden);
    });

    card.appendChild(header);
    card.appendChild(subfolders);
    return card;
}

function filterCasesForQuery(rows, queryText) {
    const query = String(queryText || "").trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((item) => {
        const caseNo = String(item?.case_no || "").toLowerCase();
        if (caseNo.includes(query)) return true;

        const folders = item?.folders && typeof item.folders === "object" ? item.folders : {};
        return Object.entries(folders).some(([moduleName, files]) => {
            if (folderLabel(moduleName).toLowerCase().includes(query)) return true;
            return (Array.isArray(files) ? files : []).some((file) => {
                return String(file?.file_name || "").toLowerCase().includes(query);
            });
        });
    });
}

function applyRequestedCaseFilter(rows) {
    hasRequestedCaseMatch = false;
    if (!requestedCaseNo) return rows;
    const match = rows.filter((row) => String(row?.case_no || "").trim().toLowerCase() === requestedCaseNo);
    if (match.length) {
        hasRequestedCaseMatch = true;
        return match;
    }
    return rows;
}

function renderDrawyerCases(rows) {
    if (!drawyerFoldersContainerEl) return;
    drawyerFoldersContainerEl.innerHTML = "";

    if (!rows.length) {
        drawyerFoldersContainerEl.innerHTML = `<p class="drawyer-empty">No uploaded or captured cases found.</p>`;
        return;
    }

    rows.forEach((caseData) => {
        drawyerFoldersContainerEl.appendChild(createCaseFolder(caseData));
    });

    if (requestedCaseNo && hasRequestedCaseMatch) {
        const first = drawyerFoldersContainerEl.querySelector(".drawyer-case-header");
        if (first) first.click();
    }
}

function applyFilter() {
    const selected = applyRequestedCaseFilter(drawyerCases);
    const filtered = filterCasesForQuery(selected, drawyerSearchEl?.value || "");
    renderDrawyerCases(filtered);
}

async function loadDrawyer(forceSync) {
    const endpoint = forceSync ? "/google-drive/sync-now" : "/drawyer/files";
    const method = forceSync ? "POST" : "GET";

    const res = await request(endpoint, method, forceSync ? {} : null);
    drawyerCases = Array.isArray(res?.cases) ? res.cases : [];
    applyFilter();

    if (forceSync) {
        const synced = Number(res?.sync?.synced || 0);
        const failed = Number(res?.sync?.failed || 0);
        if (typeof showMessageBox === "function") {
            showMessageBox(`Drive sync: ${synced} synced, ${failed} failed.`);
        } else {
            alert(`Drive sync: ${synced} synced, ${failed} failed.`);
        }
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search || "");
    requestedCaseNo = String(params.get("case_no") || "").trim().toLowerCase();

    if (drawyerSearchEl) {
        drawyerSearchEl.addEventListener("input", applyFilter);
    }

    if (drawyerSyncBtnEl) {
        drawyerSyncBtnEl.addEventListener("click", async () => {
            try {
                await loadDrawyer(true);
            } catch (err) {
                alert(err.message || "Failed to sync Drawyer files.");
            }
        });
    }

    try {
        await loadDrawyer(false);
    } catch (err) {
        alert(err.message || "Failed to load Drawyer files.");
    }
});
