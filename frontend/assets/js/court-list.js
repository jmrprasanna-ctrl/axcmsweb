const COURT_LIST_PATH = "/support/court-list.html";
const LEGACY_SUPPORT_PATH = "/support/support.html";

function roleName(){
    return (localStorage.getItem("role") || "").toLowerCase();
}

function hasAccess(path){
    if(typeof hasUserGrantedPath === "function" && hasUserGrantedPath(path)) return true;
    if(typeof hasUserActionPermission === "function"){
        return hasUserActionPermission(path, "view")
            || hasUserActionPermission(path, "add")
            || hasUserActionPermission(path, "edit")
            || hasUserActionPermission(path, "delete");
    }
    return false;
}

function canViewCourts(){
    const role = roleName();
    if(role === "admin" || role === "manager"){
        if(typeof hasAccessConfigRestrictions === "function" && hasAccessConfigRestrictions()){
            return hasAccess(COURT_LIST_PATH) || hasAccess(LEGACY_SUPPORT_PATH);
        }
        return true;
    }
    return hasAccess(COURT_LIST_PATH) || hasAccess(LEGACY_SUPPORT_PATH);
}

function canDeleteCourt(){
    const role = roleName();
    if(role !== "admin" && role !== "manager" && role !== "user") return false;
    if(typeof hasAccessConfigRestrictions === "function" && hasAccessConfigRestrictions()){
        return (typeof hasUserActionPermission === "function" && (
            hasUserActionPermission(COURT_LIST_PATH, "delete")
            || hasUserActionPermission(LEGACY_SUPPORT_PATH, "delete")
        ));
    }
    if(role === "user"){
        return (typeof hasUserActionPermission === "function" && (
            hasUserActionPermission(COURT_LIST_PATH, "delete")
            || hasUserActionPermission(LEGACY_SUPPORT_PATH, "delete")
        ));
    }
    return true;
}

function esc(v){
    return String(v || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderRows(rows){
    const tbody = document.getElementById("courtTableBody");
    if(!tbody) return;
    const list = Array.isArray(rows) ? rows : [];
    if(!list.length){
        tbody.innerHTML = `<tr><td colspan="5">No courts found.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((row) => `
        <tr>
            <td>${row.id}</td>
            <td>${esc(row.name)}</td>
            <td>${esc(row.address)}</td>
            <td>${esc(row.area)}</td>
            <td>${canDeleteCourt() ? `<button type="button" class="btn btn-danger btn-inline" data-court-delete="${row.id}">Delete</button>` : "-"}</td>
        </tr>
    `).join("");
}

async function loadCourts(){
    try{
        const rows = await request("/support/courts", "GET");
        renderRows(rows);
    }catch(err){
        alert(err.message || "Failed to load courts.");
    }
}

async function deleteCourt(id){
    if(!canDeleteCourt()){
        alert("You don't have permission to delete.");
        return;
    }
    if(!confirm("Delete this court?")) return;
    try{
        await request(`/support/courts/${id}`, "DELETE");
        await loadCourts();
    }catch(err){
        alert(err.message || "Failed to delete court.");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    if(typeof window.__waitForUserAccessPermissions === "function"){
        await window.__waitForUserAccessPermissions();
    }
    if(!canViewCourts()){
        alert("You don't have access to Court List.");
        window.location.href = "../dashboard.html";
        return;
    }

    document.body.addEventListener("click", (event) => {
        const btn = event.target.closest("button[data-court-delete]");
        if(!btn) return;
        const id = Number(btn.getAttribute("data-court-delete") || 0);
        if(!id) return;
        deleteCourt(id);
    });

    await loadCourts();
});
