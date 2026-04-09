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

function fileRowHtml(file){
    const status = String(file.sync_status || "").toLowerCase() === "synced"
        ? `<span class="drawyer-status-ok">Synced</span>`
        : `<span class="drawyer-status-pending">Pending</span>`;
    const driveLink = String(file.drive_web_view_link || "").trim()
        ? `<a href="${escapeHtml(file.drive_web_view_link)}" target="_blank" rel="noopener">Open</a>`
        : "-";
    return `
        <div class="drawyer-file-row">
            <div>${escapeHtml(file.file_name || "-")}</div>
            <div>${escapeHtml(file.upload_method || "-")}</div>
            <div>${status}</div>
            <div>${driveLink}</div>
        </div>
        <div class="drawyer-file-meta">${escapeHtml(fmtDate(file.updated_at) || "")}</div>
    `;
}

function folderHtml(folderName, files){
    const rows = (Array.isArray(files) ? files : []).map(fileRowHtml).join("");
    return `
        <section class="drawyer-folder">
            <h4>${escapeHtml(folderName)}</h4>
            ${rows || `<p class="drawyer-empty">No files.</p>`}
        </section>
    `;
}

function caseHtml(item){
    const folders = item && item.folders ? item.folders : {};
    const folderNames = Object.keys(folders);
    const body = folderNames.map((name) => folderHtml(name, folders[name])).join("");
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
    host.innerHTML = rows.map(caseHtml).join("");
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

    try{
        await loadDrawyer(false);
    }catch(err){
        alert(err.message || "Failed to load Drawyer files.");
    }
});
