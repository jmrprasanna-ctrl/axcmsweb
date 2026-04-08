const BACKUP_ACCESS_PATH = "/users/backup.html";

function hasBackupPermission(action){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role === "admin"){
        return true;
    }
    if(typeof hasUserActionPermission === "function" && hasUserActionPermission(BACKUP_ACCESS_PATH, action)){
        return true;
    }
    return typeof hasUserGrantedPath === "function" && hasUserGrantedPath(BACKUP_ACCESS_PATH);
}

function applyBackupButtonVisibility(){
    const checkBtn = document.getElementById("btnCheckTools");
    const backupBtn = document.getElementById("btnBackup");
    const uploadBtn = document.getElementById("btnUploadDb");
    if(checkBtn) checkBtn.classList.toggle("is-hidden", !hasBackupPermission("view"));
    if(backupBtn) backupBtn.classList.toggle("is-hidden", !hasBackupPermission("add"));
    if(uploadBtn) uploadBtn.classList.toggle("is-hidden", !hasBackupPermission("edit"));
}

async function downloadSystemBackup(){
    const token = localStorage.getItem("token");
    if(!token){
        alert("Please login first.");
        return;
    }

    try{
        const apiBase = (
            window.BASE_URL ||
            `${window.location.origin.replace(/\/+$/, "")}/api`
        ).replace(/\/+$/, "");
        const res = await fetch(`${apiBase}/system-backup/download`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });
        if(!res.ok){
            const raw = await res.text();
            let message = "Failed to create backup";
            try{
                message = JSON.parse(raw).message || message;
            }catch(_err){
                if(raw) message = raw;
            }
            throw new Error(message);
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const fileNameMatch = disposition.match(/filename="([^"]+)"/i);
        const fileName = (fileNameMatch && fileNameMatch[1]) ? fileNameMatch[1] : `axiscmsdb_backup_${Date.now()}.sql`;

        if(window.showSaveFilePicker){
            const handle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: "SQL Backup File",
                    accept: {
                        "application/sql": [".sql"],
                        "text/sql": [".sql"],
                        "text/plain": [".sql"]
                    }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        }else{
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        }
        showMessageBox("Backup downloaded");
    }catch(err){
        if(err && err.name === "AbortError") return;
        alert(err.message || "Failed to create backup");
    }
}

async function checkBackupTools(){
    try{
        const status = await request("/system-backup/status", "GET");
        const pgDump = status?.tools?.pg_dump;
        const psql = status?.tools?.psql;
        if(status.ok){
            showMessageBox("Backup tools are ready");
            return;
        }
        alert(
            `Tools not ready.\n\n` +
            `pg_dump: ${pgDump?.available ? "OK" : "Missing"}\n` +
            `Command: ${pgDump?.command || "N/A"}\n\n` +
            `psql: ${psql?.available ? "OK" : "Missing"}\n` +
            `Command: ${psql?.command || "N/A"}`
        );
    }catch(err){
        alert(err.message || "Failed to check backup tools");
    }
}

function openRestorePicker(){
    const input = document.getElementById("restore-db-file");
    if(!input) return;
    input.value = "";
    input.click();
}

async function restoreSystemBackup(event){
    const file = event.target.files && event.target.files[0];
    if(!file) return;

    if(!file.name.toLowerCase().endsWith(".sql")){
        alert("Please select a .sql backup file");
        return;
    }

    if(!confirm("This will restore the uploaded SQL to the current database. Continue?")) return;

    try{
        const sqlText = await file.text();
        await request("/system-backup/restore", "POST", { fileName: file.name, sqlText });
        showMessageBox("Database restored");
    }catch(err){
        alert(err.message || "Failed to restore database");
    }
}

function bindBackupButtons(){
    const checkBtn = document.getElementById("btnCheckTools");
    const backupBtn = document.getElementById("btnBackup");
    const uploadBtn = document.getElementById("btnUploadDb");
    const restoreInput = document.getElementById("restore-db-file");
    if(checkBtn) checkBtn.addEventListener("click", checkBackupTools);
    if(backupBtn) backupBtn.addEventListener("click", downloadSystemBackup);
    if(uploadBtn) uploadBtn.addEventListener("click", openRestorePicker);
    if(restoreInput) restoreInput.addEventListener("change", restoreSystemBackup);
}

async function bootstrapBackupPage(){
    if(typeof window.__waitForUserAccessPermissions === "function"){
        await window.__waitForUserAccessPermissions();
    }
    bindBackupButtons();
    applyBackupButtonVisibility();
}

if(document.readyState === "loading"){
    window.addEventListener("DOMContentLoaded", bootstrapBackupPage);
}else{
    bootstrapBackupPage();
}
