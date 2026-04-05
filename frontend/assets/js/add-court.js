const ADD_COURT_ACCESS_PATH = "/support/add-court.html";

function getRole() {
    return (localStorage.getItem("role") || "").toLowerCase();
}

function canAddCourtPage() {
    const role = getRole();
    const hasPermission = () => {
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(ADD_COURT_ACCESS_PATH)) return true;
        if (typeof hasUserActionPermission === "function") {
            return hasUserActionPermission(ADD_COURT_ACCESS_PATH, "view")
                || hasUserActionPermission(ADD_COURT_ACCESS_PATH, "add")
                || hasUserActionPermission("/support/support.html", "add");
        }
        return false;
    };
    if (role === "admin" || role === "manager") {
        if (typeof hasAccessConfigRestrictions === "function" && hasAccessConfigRestrictions()) {
            return hasPermission();
        }
        return true;
    }
    return hasPermission();
}

window.addEventListener("DOMContentLoaded", async () => {
    if (typeof window.__waitForUserAccessPermissions === "function") {
        await window.__waitForUserAccessPermissions();
    }
    if (!canAddCourtPage()) {
        alert("You don't have access to Add Court.");
        window.location.href = "../dashboard.html";
        return;
    }

    const input = document.getElementById("courtName");
    const form = document.getElementById("addCourtForm");
    if (input) {
        input.addEventListener("input", () => {
            input.value = String(input.value || "").toUpperCase();
        });
    }

    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = String(input?.value || "").trim().toUpperCase();
        if (!name) {
            alert("Court name is required.");
            return;
        }
        try {
            await request("/support/courts", "POST", { name });
            showMessageBox("Court added successfully");
            form.reset();
            if (input) input.focus();
        } catch (err) {
            alert(err.message || "Failed to add court");
        }
    });
});
