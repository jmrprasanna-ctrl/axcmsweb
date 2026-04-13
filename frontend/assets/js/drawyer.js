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
                <button type="button" class="download-btn" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(moduleName)}" data-index="${index}">Download</button>
            </div>
        </div>
        <div class="drawyer-file-meta">${escapeHtml(fmtDate(file.updated_at) || "")}</div>
    `;
}

function buildFolderHtml(folderName, files, caseNo){
    const rows = (Array.isArray(files) ? files : []).map((file, index) => buildFileRow(file, caseNo, folderName, index)).join("");
    return `
        <section class="drawyer-folder">
            <button type="button" class="folder-toggle" data-case="${escapeHtml(caseNo)}" data-module="${escapeHtml(folderName)}">
                ${escapeHtml(folderName)} (${(Array.isArray(files) ? files.length : 0)})
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
            <h3>Case: ${escapeHtml(item.case_no || "UNKNOWN_CASE")}</h3>
            ${body || `<p class="drawyer-empty">No uploaded files.</p>`}
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

function downloadFile(caseNo, moduleName, index){
    const url = `/api/drawyer/download?case_no=${encodeURIComponent(caseNo)}&module=${encodeURIComponent(moduleName)}&index=${encodeURIComponent(index)}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

function handleDrawyerClick(event){
    const toggle = event.target.closest(".folder-toggle");
    if(toggle){
        const caseNo = toggle.dataset.case || "";
        const moduleName = toggle.dataset.module || "";
        const fileList = document.querySelector(`.drawyer-folder-files[data-case='${CSS.escape(caseNo)}'][data-module='${CSS.escape(moduleName)}']`);
        if(fileList){
            const expanded = fileList.hidden;
            fileList.hidden = !fileList.hidden;
            toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        }
        return;
    }

    const downloadBtn = event.target.closest(".download-btn");
    if(downloadBtn){
        const caseNo = downloadBtn.dataset.case || "";
        const moduleName = downloadBtn.dataset.module || "";
        const index = downloadBtn.dataset.index || "0";
        downloadFile(caseNo, moduleName, index);
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
