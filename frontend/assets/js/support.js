const SUPPORT_ACCESS_PATH = "/support/support.html";

function getRole() {
    return (localStorage.getItem("role") || "").toLowerCase();
}

function hasSupportAction(action) {
    if (typeof hasUserActionPermission === "function") {
        return hasUserActionPermission(SUPPORT_ACCESS_PATH, action);
    }
    return false;
}

function canViewSupport() {
    const role = getRole();
    const hasSupportPermission = () => {
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(SUPPORT_ACCESS_PATH)) {
            return true;
        }
        return hasSupportAction("view") || hasSupportAction("add") || hasSupportAction("edit") || hasSupportAction("delete");
    };
    if (role === "admin" || role === "manager") {
        if (typeof hasAccessConfigRestrictions === "function" && hasAccessConfigRestrictions()) {
            return hasSupportPermission();
        }
        return true;
    }
    return hasSupportPermission();
}

function canDeleteSupport() {
    const role = getRole();
    if (role !== "admin" && role !== "manager" && role !== "user") return false;
    if (typeof hasAccessConfigRestrictions === "function" && hasAccessConfigRestrictions()) {
        return hasSupportAction("delete");
    }
    if (role === "user") {
        return hasSupportAction("delete");
    }
    return true;
}

function renderSimpleTableRows(tbodyId, rows, type) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = "";
    rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.id}</td>
            <td>${row.name || ""}</td>
            <td>
                ${canDeleteSupport() ? `<button type="button" class="btn btn-danger btn-inline" data-delete="${type}" data-id="${row.id}">Delete</button>` : "<span>-</span>"}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadLawyers() {
    try {
        const rows = await request("/support/lawyers", "GET");
        renderSimpleTableRows("lawyerTableBody", Array.isArray(rows) ? rows : [], "lawyer");
    } catch (err) {
        alert(err.message || "Failed to load lawyers");
    }
}

async function loadCourts() {
    try {
        const rows = await request("/support/courts", "GET");
        renderSimpleTableRows("courtTableBody", Array.isArray(rows) ? rows : [], "court");
    } catch (err) {
        alert(err.message || "Failed to load courts");
    }
}

async function deleteSupportItem(type, id) {
    if (!canDeleteSupport()) {
        alert("You don't have permission to delete.");
        return;
    }
    if (!confirm("Delete this item?")) return;
    try {
        if (type === "lawyer") {
            await request(`/support/lawyers/${id}`, "DELETE");
            await loadLawyers();
            return;
        }
        await request(`/support/courts/${id}`, "DELETE");
        await loadCourts();
    } catch (err) {
        alert(err.message || "Failed to delete item");
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.__waitForUserAccessPermissions === "function") {
        await window.__waitForUserAccessPermissions();
    }

    if (!canViewSupport()) {
        alert("You don't have access to Support.");
        window.location.href = "../dashboard.html";
        return;
    }

    document.body.addEventListener("click", (event) => {
        const btn = event.target?.closest?.("button[data-delete]");
        if (!btn) return;
        const type = String(btn.getAttribute("data-delete") || "");
        const id = Number(btn.getAttribute("data-id") || 0);
        if (!id) return;
        deleteSupportItem(type, id);
    });

    await Promise.all([loadLawyers(), loadCourts()]);
});
