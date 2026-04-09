function esc(value){
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

const contactsSearchEl = document.getElementById("contactsSearch");
const contactsTypeEl = document.getElementById("contactsType");
let allContacts = [];

function renderContacts(rows){
    const tbody = document.querySelector("#contactsTable tbody");
    if(!tbody) return;
    const list = Array.isArray(rows) ? rows : [];
    if(!list.length){
        tbody.innerHTML = `<tr><td colspan="5">No contacts found.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((row) => `
        <tr>
            <td>${esc(row.contact_type === "lawyer" ? "Lawyer" : "Client")}</td>
            <td>${esc(row.customer_id)}</td>
            <td>${esc(row.name)}</td>
            <td>${esc(row.mobile)}</td>
            <td><a href="mailto:${esc(row.email)}">${esc(row.email)}</a></td>
        </tr>
    `).join("");
}

function applyFilters(){
    const q = String(contactsSearchEl?.value || "").trim().toLowerCase();
    const type = String(contactsTypeEl?.value || "all").trim().toLowerCase();
    const filtered = allContacts.filter((row) => {
        const rowType = String(row.contact_type || "").toLowerCase();
        if(type !== "all" && rowType !== type) return false;
        if(!q) return true;
        const hay = [
            row.customer_id,
            row.name,
            row.mobile,
            row.email,
            rowType,
        ].map((x) => String(x || "").toLowerCase()).join(" ");
        return hay.includes(q);
    });
    renderContacts(filtered);
}

async function loadContacts(){
    const data = await request("/contacts", "GET");
    allContacts = data && Array.isArray(data.contacts) ? data.contacts : [];
    applyFilters();
}

window.addEventListener("DOMContentLoaded", async () => {
    if(contactsSearchEl){
        contactsSearchEl.addEventListener("input", applyFilters);
    }
    if(contactsTypeEl){
        contactsTypeEl.addEventListener("change", applyFilters);
    }
    try{
        await loadContacts();
    }catch(err){
        alert(err.message || "Failed to load contacts");
    }
});
