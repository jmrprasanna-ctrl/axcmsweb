const ADD_COURT_ACCESS_PATH = "/support/add-court.html";
const COURT_LIST_ACCESS_PATH = "/support/court-list.html";

function getRole() {
    return (localStorage.getItem("role") || "").toLowerCase();
}

function canAddCourtPage() {
    const role = getRole();
    const hasPermission = () => {
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(ADD_COURT_ACCESS_PATH)) return true;
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(COURT_LIST_ACCESS_PATH)) return true;
        if (typeof hasUserActionPermission === "function") {
            return hasUserActionPermission(ADD_COURT_ACCESS_PATH, "view")
                || hasUserActionPermission(ADD_COURT_ACCESS_PATH, "add")
                || hasUserActionPermission(COURT_LIST_ACCESS_PATH, "add")
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
    const addressInput = document.getElementById("courtAddress");
    const areaInput = document.getElementById("courtArea");
    const form = document.getElementById("addCourtForm");
    if (input) {
        input.addEventListener("input", () => {
            input.value = String(input.value || "").toUpperCase();
        });
    }
    if (addressInput) {
        addressInput.addEventListener("input", () => {
            addressInput.value = String(addressInput.value || "").toUpperCase();
        });
    }
    if (areaInput) {
        areaInput.addEventListener("input", () => {
            areaInput.value = String(areaInput.value || "").toUpperCase();
        });
    }

    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = String(input?.value || "").trim().toUpperCase();
        const address = String(addressInput?.value || "").trim().toUpperCase();
        const area = String(areaInput?.value || "").trim().toUpperCase();
        if (!name) {
            alert("Court name is required.");
            return;
        }
        try {
            await request("/support/courts", "POST", { name, address, area });
            showMessageBox("Court added successfully");
            form.reset();
            if (input) input.focus();
        } catch (err) {
            alert(err.message || "Failed to add court");
        }
    });
});
