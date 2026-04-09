function val(id){
    return document.getElementById(id);
}

function toBool(value){
    return String(value || "").toLowerCase() === "true";
}

function fillForm(settings){
    const s = settings || {};
    val("gdEnabled").value = String(s.enabled !== false);
    val("gdClientId").value = String(s.client_id || "");
    val("gdClientSecret").value = "";
    val("gdRefreshToken").value = "";
    val("gdRootFolder").value = String(s.root_folder_name || "AXIS_CMS_DRAWYER");
    val("gdAutoSync").value = String(s.auto_sync !== false);
    val("gdCompress").value = String(s.compress_before_upload !== false);
}

function payloadFromForm(){
    return {
        enabled: toBool(val("gdEnabled").value),
        client_id: String(val("gdClientId").value || "").trim(),
        client_secret: String(val("gdClientSecret").value || "").trim(),
        refresh_token: String(val("gdRefreshToken").value || "").trim(),
        root_folder_name: String(val("gdRootFolder").value || "").trim(),
        auto_sync: toBool(val("gdAutoSync").value),
        compress_before_upload: toBool(val("gdCompress").value),
    };
}

async function loadSettings(){
    const data = await request("/google-drive/settings", "GET");
    fillForm(data || {});
}

async function saveSettings(){
    const payload = payloadFromForm();
    const res = await request("/google-drive/settings", "PUT", payload);
    fillForm((res && res.settings) || {});
    showMessageBox("Google Drive settings saved.");
}

async function testConnection(){
    const payload = payloadFromForm();
    const res = await request("/google-drive/test", "POST", payload);
    if(res && res.ok){
        showMessageBox("Google Drive connected.");
    }else{
        alert((res && res.message) || "Google Drive connection failed.");
    }
}

async function syncNow(){
    const res = await request("/google-drive/sync-now", "POST", {});
    const sync = res && res.sync ? res.sync : {};
    showMessageBox(`Sync done: ${Number(sync.synced || 0)} synced, ${Number(sync.failed || 0)} failed.`);
}

window.addEventListener("DOMContentLoaded", async () => {
    const form = val("googleDriveForm");
    const testBtn = val("gdTestBtn");
    const syncBtn = val("gdSyncBtn");

    if(form){
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            try{
                await saveSettings();
            }catch(err){
                alert(err.message || "Failed to save Google Drive settings.");
            }
        });
    }

    if(testBtn){
        testBtn.addEventListener("click", async () => {
            try{
                await testConnection();
            }catch(err){
                alert(err.message || "Google Drive connection failed.");
            }
        });
    }

    if(syncBtn){
        syncBtn.addEventListener("click", async () => {
            try{
                await syncNow();
            }catch(err){
                alert(err.message || "Drive sync failed.");
            }
        });
    }

    try{
        await loadSettings();
    }catch(err){
        alert(err.message || "Failed to load Google Drive settings.");
    }
});
