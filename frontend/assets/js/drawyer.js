const drawyerSyncBtnEl = document.getElementById("drawyerSyncBtn");
const drawyerSearchEl = document.getElementById("drawyerSearch");
const drawyerFoldersContainerEl = document.getElementById("drawyerFoldersContainer");

let drawyerCases = [];
let requestedCaseNo = "";
let currentCaseNo = "";
let currentModuleName = "";
let caseMetaByNo = new Map();

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

function getCaseByNo(caseNo) {
    return drawyerCases.find((item) => String(item?.case_no || "").trim() === caseNo) || null;
}

function getCaseCustomerName(caseNo) {
    const meta = caseMetaByNo.get(String(caseNo || "").trim().toUpperCase());
    return String(meta?.customer_name || "").trim();
}

function getFoldersForCase(caseNo) {
    const caseItem = getCaseByNo(caseNo);
    const folders = caseItem?.folders && typeof caseItem.folders === "object" ? caseItem.folders : {};
    return Object.entries(folders)
        .filter((entry) => Array.isArray(entry[1]) && entry[1].length > 0)
        .map(([moduleName, files]) => ({
            moduleName,
            label: folderLabel(moduleName),
            files,
        }));
}

function getFilesForFolder(caseNo, moduleName) {
    const caseItem = getCaseByNo(caseNo);
    const files = caseItem?.folders?.[moduleName];
    return Array.isArray(files) ? files : [];
}

function buildFileDownloadUrl(file) {
    return `/api/drawyer/download?source_table=${encodeURIComponent(file.source_table || "")}&source_id=${encodeURIComponent(file.source_id || "")}&file_index=${encodeURIComponent(file.file_index || 0)}`;
}

function clearHost() {
    if (drawyerFoldersContainerEl) {
        drawyerFoldersContainerEl.innerHTML = "";
    }
}

function setSearchVisibility(show) {
    if (!drawyerSearchEl) return;
    drawyerSearchEl.style.display = show ? "block" : "none";
}

function renderViewHeader(title, subtitle, backLabel, onBack) {
    const header = document.createElement("div");
    header.className = "drawyer-view-header";

    if (backLabel) {
        const backBtn = document.createElement("button");
        backBtn.type = "button";
        backBtn.className = "drawyer-back-btn";
        backBtn.textContent = backLabel;
        backBtn.addEventListener("click", onBack);
        header.appendChild(backBtn);
    }

    const textWrap = document.createElement("div");
    textWrap.className = "drawyer-header-text";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    textWrap.appendChild(h3);
    if (subtitle) {
        const p = document.createElement("p");
        p.textContent = subtitle;
        textWrap.appendChild(p);
    }
    header.appendChild(textWrap);
    return header;
}

function createCaseTile(item) {
    const caseNo = String(item?.case_no || "UNKNOWN_CASE").trim();
    const folderCount = Object.keys(item?.folders || {}).length;
    const customerName = getCaseCustomerName(caseNo);

    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "drawyer-case-tile";

    const icon = document.createElement("div");
    icon.className = "drawyer-folder-emoji";
    icon.textContent = "📁";
    tile.appendChild(icon);

    const title = document.createElement("div");
    title.className = "drawyer-tile-title";
    title.textContent = caseNo;
    tile.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "drawyer-tile-subtitle";
    subtitle.textContent = customerName || `${folderCount} folder${folderCount === 1 ? "" : "s"}`;
    tile.appendChild(subtitle);

    tile.addEventListener("click", () => {
        showFoldersView(caseNo);
    });

    return tile;
}

function createFolderTile(caseNo, folderInfo) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "drawyer-case-tile folder";

    const icon = document.createElement("div");
    icon.className = "drawyer-folder-emoji";
    icon.textContent = "📂";
    tile.appendChild(icon);

    const title = document.createElement("div");
    title.className = "drawyer-tile-title";
    title.textContent = folderInfo.label;
    tile.appendChild(title);

    const subtitle = document.createElement("div");
    subtitle.className = "drawyer-tile-subtitle";
    subtitle.textContent = `${folderInfo.files.length} file${folderInfo.files.length === 1 ? "" : "s"}`;
    tile.appendChild(subtitle);

    tile.addEventListener("click", () => {
        showFilesView(caseNo, folderInfo.moduleName);
    });

    return tile;
}

function createFileRow(caseNo, moduleName, file) {
    const row = document.createElement("div");
    row.className = "drawyer-file-row";

    const left = document.createElement("div");
    left.className = "drawyer-file-left";

    const name = document.createElement("div");
    name.className = "drawyer-file-name";
    name.textContent = String(file?.file_name || "Attachment");
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "drawyer-file-meta";
    const dateText = formatDate(file?.updated_at);
    meta.textContent = dateText ? `${folderLabel(moduleName)} | ${dateText}` : folderLabel(moduleName);
    left.appendChild(meta);

    row.appendChild(left);

    const right = document.createElement("div");
    right.className = "drawyer-file-actions";

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
    downloadBtn.addEventListener("click", () => {
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
    deleteBtn.addEventListener("click", async () => {
        if (!confirm("Delete this file permanently?")) return;
        try {
            await request(
                `/drawyer/delete-file?case_no=${encodeURIComponent(caseNo)}&module=${encodeURIComponent(moduleName)}&source_table=${encodeURIComponent(file.source_table || "")}&source_id=${encodeURIComponent(file.source_id || "")}&file_index=${encodeURIComponent(file.file_index || 0)}`,
                "DELETE",
                null
            );
            await loadDrawyer(false);
            showFilesView(caseNo, moduleName);
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

    row.appendChild(right);
    return row;
}

function renderCasesView() {
    currentCaseNo = "";
    currentModuleName = "";
    setSearchVisibility(true);
    clearHost();
    if (!drawyerFoldersContainerEl) return;

    const query = String(drawyerSearchEl?.value || "").trim().toLowerCase();
    const rows = (Array.isArray(drawyerCases) ? drawyerCases : []).filter((item) => {
        if (!query) return true;
        const caseNo = String(item?.case_no || "").toLowerCase();
        if (caseNo.includes(query)) return true;
        const customerName = getCaseCustomerName(item?.case_no).toLowerCase();
        if (customerName.includes(query)) return true;
        const folders = Object.keys(item?.folders || {}).map((name) => folderLabel(name).toLowerCase());
        return folders.some((x) => x.includes(query));
    });

    if (!rows.length) {
        drawyerFoldersContainerEl.innerHTML = `<p class="drawyer-empty">No uploaded or captured cases found.</p>`;
        return;
    }

    const grid = document.createElement("div");
    grid.className = "drawyer-case-grid";

    rows.forEach((item) => {
        grid.appendChild(createCaseTile(item));
    });

    drawyerFoldersContainerEl.appendChild(grid);
}

function showFoldersView(caseNo) {
    currentCaseNo = caseNo;
    currentModuleName = "";
    setSearchVisibility(false);
    clearHost();
    if (!drawyerFoldersContainerEl) return;

    const folders = getFoldersForCase(caseNo);

    drawyerFoldersContainerEl.appendChild(
        renderViewHeader(
            caseNo,
            `${folders.length} folder${folders.length === 1 ? "" : "s"}`,
            "Back",
            () => renderCasesView()
        )
    );

    if (!folders.length) {
        const empty = document.createElement("p");
        empty.className = "drawyer-empty";
        empty.textContent = "No folders with files.";
        drawyerFoldersContainerEl.appendChild(empty);
        return;
    }

    const grid = document.createElement("div");
    grid.className = "drawyer-case-grid";
    folders.forEach((folderInfo) => {
        grid.appendChild(createFolderTile(caseNo, folderInfo));
    });
    drawyerFoldersContainerEl.appendChild(grid);
}

function showFilesView(caseNo, moduleName) {
    currentCaseNo = caseNo;
    currentModuleName = moduleName;
    setSearchVisibility(false);
    clearHost();
    if (!drawyerFoldersContainerEl) return;

    const files = getFilesForFolder(caseNo, moduleName);

    drawyerFoldersContainerEl.appendChild(
        renderViewHeader(
            `${caseNo} / ${folderLabel(moduleName)}`,
            `${files.length} file${files.length === 1 ? "" : "s"}`,
            "Back",
            () => showFoldersView(caseNo)
        )
    );

    if (!files.length) {
        const empty = document.createElement("p");
        empty.className = "drawyer-empty";
        empty.textContent = "No files found in this folder.";
        drawyerFoldersContainerEl.appendChild(empty);
        return;
    }

    const list = document.createElement("div");
    list.className = "drawyer-file-list";
    files.forEach((file) => {
        list.appendChild(createFileRow(caseNo, moduleName, file));
    });
    drawyerFoldersContainerEl.appendChild(list);
}

async function loadDrawyer(forceSync) {
    const endpoint = forceSync ? "/google-drive/sync-now" : "/drawyer/files";
    const method = forceSync ? "POST" : "GET";

    const res = await request(endpoint, method, forceSync ? {} : null);
    drawyerCases = Array.isArray(res?.cases) ? res.cases : [];

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

async function loadCaseMeta() {
    try {
        const rows = await request("/cases", "GET");
        const map = new Map();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const caseNo = String(row?.case_no || "").trim().toUpperCase();
            if (!caseNo) return;
            if (!map.has(caseNo) || row?.latest_case_no_overall_entry === true) {
                map.set(caseNo, {
                    customer_name: String(row?.customer_name || "").trim(),
                });
            }
        });
        caseMetaByNo = map;
    } catch (err) {
        caseMetaByNo = new Map();
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search || "");
    requestedCaseNo = String(params.get("case_no") || "").trim();

    if (drawyerSearchEl) {
        drawyerSearchEl.addEventListener("input", () => {
            if (!currentCaseNo && !currentModuleName) {
                renderCasesView();
            }
        });
    }

    if (drawyerSyncBtnEl) {
        drawyerSyncBtnEl.addEventListener("click", async () => {
            try {
                await loadDrawyer(true);
                if (currentModuleName && currentCaseNo) {
                    showFilesView(currentCaseNo, currentModuleName);
                } else if (currentCaseNo) {
                    showFoldersView(currentCaseNo);
                } else {
                    renderCasesView();
                }
            } catch (err) {
                alert(err.message || "Failed to sync Drawyer files.");
            }
        });
    }

    try {
        await Promise.all([loadDrawyer(false), loadCaseMeta()]);
        if (requestedCaseNo) {
            const target = drawyerCases.find((item) => String(item?.case_no || "").trim().toLowerCase() === requestedCaseNo.toLowerCase());
            if (target) {
                showFoldersView(String(target.case_no || ""));
                return;
            }
        }
        renderCasesView();
    } catch (err) {
        alert(err.message || "Failed to load Drawyer files.");
    }
});
