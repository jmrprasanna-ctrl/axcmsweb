function byId(id){
    return document.getElementById(id);
}

function escapeHtml(value){
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function fmtDate(value){
    if(!value) return "";
    const dt = new Date(value);
    if(Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleString();
}

function buildFileRow(file, caseNo, moduleName, index){
    const status = String(file.sync_status || "").toLowerCase() === "synced"
        ? `<span class="drawyer-status-ok">Synced</span>`
        : `<span class="drawyer-status-pending">Pending</span>`;
    const viewLink = String(file.drive_web_view_link || "").trim();
    const openLink = viewLink
        ? `<a href="${escapeHtml(viewLink)}" target="_blank" rel="noopener">Open</a>`
        : "-";
    return `
        <div class="drawyer-file-row" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(moduleName)}" data-index="${index}">
            <div class="drawyer-file-name">${escapeHtml(file.file_name || "-")}</div>
            <div>${escapeHtml(file.upload_method || "-")}</div>
            <div>${status}</div>
            <div class="drawyer-actions-row">
                ${openLink}
                <button type="button" class="download-btn" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(moduleName)}" data-source_table="${escapeHtml(file.source_table || "")}" data-source_id="${escapeHtml(file.source_id || "")}" data-file_index="${escapeHtml(file.file_index || "")}" data-file_name="${escapeHtml(file.file_name || "")}">Download</button>
                <button type="button" class="delete-btn" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(moduleName)}" data-source_table="${escapeHtml(file.source_table || "")}" data-source_id="${escapeHtml(file.source_id || "")}" data-file_index="${escapeHtml(file.file_index || "")}">Delete</button>
            </div>
        </div>
        <div class="drawyer-file-meta">${escapeHtml(fmtDate(file.updated_at) || "")}</div>
    `;
}

function getFolderIcon(moduleName){
    const key = String(moduleName || "").trim().toLowerCase();
    if(key.includes("plaint")) return "📄";
    if(key.includes("answer")) return "📝";
    if(key.includes("witness")) return "👤";
    if(key.includes("judgment") || key.includes("dudgment")) return "⚖️";
    return "📁";
}

function getFolderLabel(moduleName){
    const key = String(moduleName || "").trim().toLowerCase();
    if(key === "case") return "Step";
    if(key === "plaint") return "Plaint";
    if(key === "answer") return "Answer";
    if(key === "witness") return "L/Witnesses";
    if(key === "judgment" || key === "dudgment") return "Dudgement";
    return String(moduleName || "Folder");
}

function buildFolderHtml(folderName, files, caseNo){
    const label = getFolderLabel(folderName);
    const rows = (Array.isArray(files) ? files : []).map((file, index) => buildFileRow(file, caseNo, folderName, index)).join("");
    return `
        <section class="drawyer-folder-card">
            <button type="button" class="folder-card-toggle" aria-expanded="false" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(folderName)}">
                <span class="folder-card-icon">${getFolderIcon(folderName)}</span>
                <span class="folder-card-title">${escapeHtml(label)}</span>
                <span class="folder-card-meta">${(Array.isArray(files) ? files.length : 0)} files</span>
            </button>
            <div class="drawyer-folder-files" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(folderName)}" hidden>
                ${rows || `<p class="drawyer-empty">No files.</p>`}
            </div>
        </section>
    `;
}

function buildCaseHtml(item){
    const folders = item && item.folders ? item.folders : {};
    const folderNames = Object.keys(folders);
    const body = folderNames.map((name) => buildFolderHtml(name, folders[name], item.case_no)).join("");
    return `
        <article class="drawyer-case">
            <button type="button" class="case-root-toggle" aria-expanded="false" data-case="${escapeHtml(item.case_no || "UNKNOWN_CASE")}">
                <span class="drawyer-folder-icon">📁</span>
                <div>
                    <div class="drawyer-case-label">Case</div>
                    <div class="drawyer-case-title">${escapeHtml(item.case_no || "UNKNOWN_CASE")}</div>
                </div>
                <span class="drawer-file-count">${body ? folderNames.length + " folders" : "No folders"}</span>
            </button>
            <div class="drawyer-subfolder-container" data-case="${escapeHtml(item.case_no || "UNKNOWN_CASE")}" hidden>
                <div class="drawyer-subfolder-grid">
                    ${body || `<p class="drawyer-empty">No uploaded files.</p>`}
                </div>
            </div>
        </article>
    `;
}

function renderCases(cases){
    const host = byId("drawyerCases");
    if(!host) return;
    const rows = Array.isArray(cases) ? cases : [];
    if(!rows.length){
        host.innerHTML = `<p class="drawyer-empty">No uploaded or captured files found.</p>`;
        return;
    }
    host.innerHTML = rows.map(buildCaseHtml).join("");
}

async function downloadFile(caseNo, moduleName, sourceTable, sourceId, fileIndex, fileName){
    let url;
    if (sourceTable && sourceId && fileIndex !== "") {
        url = `/api/drawyer/download?source_table=${encodeURIComponent(sourceTable)}&source_id=${encodeURIComponent(sourceId)}&file_index=${encodeURIComponent(fileIndex)}`;
    } else {
        url = `/api/drawyer/download?case_no=${encodeURIComponent(caseNo)}&module=${encodeURIComponent(moduleName)}&index=${encodeURIComponent(fileIndex)}`;
    }
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = String(fileName || "");
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

async function deleteFile(caseNo, moduleName, sourceTable, sourceId, fileIndex){
    if(!confirm("Delete this file permanently?")) return;
    const endpoint = `/drawyer/delete-file?case_no=${encodeURIComponent(caseNo)}&module=${encodeURIComponent(moduleName)}&source_table=${encodeURIComponent(sourceTable)}&source_id=${encodeURIComponent(sourceId)}&file_index=${encodeURIComponent(fileIndex)}`;
    try {
        await request(endpoint, "DELETE", null);
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
}

function handleDrawyerClick(event){
    const caseToggle = event.target.closest(".case-root-toggle");
    if(caseToggle){
        const caseNo = caseToggle.dataset.case || "";
        const folderContainer = document.querySelector(`.drawyer-subfolder-container[data-case='${CSS.escape(caseNo)}']`);
        if(folderContainer){
            const expanded = folderContainer.hidden;
            folderContainer.hidden = !folderContainer.hidden;
            caseToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        }
        return;
    }

    const folderToggle = event.target.closest(".folder-card-toggle");
    if(folderToggle){
        const caseNo = folderToggle.dataset.case || "";
        const moduleName = folderToggle.dataset.module || "";
        const fileList = document.querySelector(`.drawyer-folder-files[data-case='${CSS.escape(caseNo)}'][data-module='${CSS.escape(moduleName)}']`);
        if(fileList){
            const expanded = fileList.hidden;
            fileList.hidden = !fileList.hidden;
            folderToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        }
        return;
    }

    const downloadBtn = event.target.closest(".download-btn");
    if(downloadBtn){
        const caseNo = downloadBtn.dataset.case || "";
        const moduleName = downloadBtn.dataset.module || "";
        const sourceTable = downloadBtn.dataset.source_table || "";
        const sourceId = downloadBtn.dataset.source_id || "";
        const fileIndex = downloadBtn.dataset.file_index || "";
        const fileName = downloadBtn.dataset.file_name || "";
        downloadFile(caseNo, moduleName, sourceTable, sourceId, fileIndex, fileName);
        return;
    }

    const deleteBtn = event.target.closest(".delete-btn");
    if(deleteBtn){
        const caseNo = deleteBtn.dataset.case || "";
        const moduleName = deleteBtn.dataset.module || "";
        const sourceTable = deleteBtn.dataset.source_table || "";
        const sourceId = deleteBtn.dataset.source_id || "";
        const fileIndex = deleteBtn.dataset.file_index || "";
        deleteFile(caseNo, moduleName, sourceTable, sourceId, fileIndex);
    }
}

async function loadDrawyer(forceSync){
    const endpoint = forceSync ? "/google-drive/sync-now" : "/drawyer/files";
    const method = forceSync ? "POST" : "GET";
    const res = await request(endpoint, method, forceSync ? {} : null);
    renderCases(res && Array.isArray(res.cases) ? res.cases : []);
    if(forceSync){
        const sync = res && res.sync ? res.sync : {};
        showMessageBox(`Drive sync: ${Number(sync.synced || 0)} synced, ${Number(sync.failed || 0)} failed.`);
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    const syncBtn = byId("drawyerSyncBtn");
    if(syncBtn){
        syncBtn.addEventListener("click", async () => {
            try{
                await loadDrawyer(true);
            }catch(err){
                alert(err.message || "Failed to sync Drawyer files.");
            }
        });
    }

    const host = byId("drawyerCases");
    if(host){
        host.addEventListener("click", handleDrawyerClick);
    }

    try{
        await loadDrawyer(false);
    }catch(err){
        alert(err.message || "Failed to load Drawyer files.");
    }
});
