const ADD_LAWYER_ACCESS_PATH = "/support/add-lawyer.html";

function getRole() {
    return (localStorage.getItem("role") || "").toLowerCase();
}

function canAddLawyerPage() {
    const role = getRole();
    const hasPermission = () => {
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(ADD_LAWYER_ACCESS_PATH)) return true;
        if (typeof hasUserActionPermission === "function") {
            return hasUserActionPermission(ADD_LAWYER_ACCESS_PATH, "view")
                || hasUserActionPermission(ADD_LAWYER_ACCESS_PATH, "add")
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
    if (!canAddLawyerPage()) {
        alert("You don't have access to Add Lawyer.");
        window.location.href = "../dashboard.html";
        return;
    }

    const input = document.getElementById("lawyerName");
    const form = document.getElementById("addLawyerForm");
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
            alert("Lawyer name is required.");
            return;
        }
        try {
            await request("/support/lawyers", "POST", { name });
            showMessageBox("Lawyer added successfully");
            form.reset();
            if (input) input.focus();
        } catch (err) {
            alert(err.message || "Failed to add lawyer");
        }
    });
});
