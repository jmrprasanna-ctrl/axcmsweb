const ADD_LAWYER_ACCESS_PATH = "/support/add-lawyer.html";
const LAWYER_LIST_ACCESS_PATH = "/support/lawyer-list.html";

function getRole() {
    return (localStorage.getItem("role") || "").toLowerCase();
}

function canAddLawyerPage() {
    const role = getRole();
    const hasPermission = () => {
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(ADD_LAWYER_ACCESS_PATH)) return true;
        if (typeof hasUserGrantedPath === "function" && hasUserGrantedPath(LAWYER_LIST_ACCESS_PATH)) return true;
        if (typeof hasUserActionPermission === "function") {
            return hasUserActionPermission(ADD_LAWYER_ACCESS_PATH, "view")
                || hasUserActionPermission(ADD_LAWYER_ACCESS_PATH, "add")
                || hasUserActionPermission(LAWYER_LIST_ACCESS_PATH, "add")
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
    const addressInput = document.getElementById("lawyerAddress");
    const areaSelect = document.getElementById("lawyerArea");
    const mobileInput = document.getElementById("lawyerMobile");
    const emailInput = document.getElementById("lawyerEmail");
    const form = document.getElementById("addLawyerForm");

    async function loadCourtAreas(){
        if(!areaSelect) return;
        try{
            const rows = await request("/support/courts", "GET");
            const areas = Array.isArray(rows)
                ? rows.map((row) => String(row.area || row.name || "").trim().toUpperCase()).filter(Boolean)
                : [];
            const uniqueAreas = Array.from(new Set(areas)).sort((a, b) => a.localeCompare(b));
            areaSelect.innerHTML = `<option value="">Select Area</option>` + uniqueAreas.map((x) => `<option value="${x}">${x}</option>`).join("");
        }catch(_err){
            areaSelect.innerHTML = `<option value="">Select Area</option>`;
        }
    }

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
    if (mobileInput) {
        mobileInput.addEventListener("input", () => {
            mobileInput.value = String(mobileInput.value || "").trim();
        });
    }

    await loadCourtAreas();

    if (!form) return;
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = String(input?.value || "").trim().toUpperCase();
        const address = String(addressInput?.value || "").trim().toUpperCase();
        const area = String(areaSelect?.value || "").trim().toUpperCase();
        const mobile = String(mobileInput?.value || "").trim();
        const email = String(emailInput?.value || "").trim().toLowerCase();
        if (!name) {
            alert("Lawyer name is required.");
            return;
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert("Enter a valid email.");
            return;
        }
        try {
            await request("/support/lawyers", "POST", { name, address, area, mobile, email });
            showMessageBox("Lawyer added successfully");
            form.reset();
            if (input) input.focus();
        } catch (err) {
            alert(err.message || "Failed to add lawyer");
        }
    });
});
