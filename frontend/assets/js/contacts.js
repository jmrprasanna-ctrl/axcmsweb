function esc(value){
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderLawyers(rows){
    const tbody = document.querySelector("#lawyerContactsTable tbody");
    if(!tbody) return;
    const list = Array.isArray(rows) ? rows : [];
    if(!list.length){
        tbody.innerHTML = `<tr><td colspan="3">No lawyer contacts with email found.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((row) => `
        <tr>
            <td>${esc(row.name)}</td>
            <td>${esc(row.mobile)}</td>
            <td><a href="mailto:${esc(row.email)}">${esc(row.email)}</a></td>
        </tr>
    `).join("");
}

function renderClients(rows){
    const tbody = document.querySelector("#clientContactsTable tbody");
    if(!tbody) return;
    const list = Array.isArray(rows) ? rows : [];
    if(!list.length){
        tbody.innerHTML = `<tr><td colspan="4">No client contacts with email found.</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((row) => `
        <tr>
            <td>${esc(row.customer_id)}</td>
            <td>${esc(row.name)}</td>
            <td>${esc(row.mobile)}</td>
            <td><a href="mailto:${esc(row.email)}">${esc(row.email)}</a></td>
        </tr>
    `).join("");
}

async function loadContacts(){
    const data = await request("/contacts", "GET");
    renderLawyers(data && Array.isArray(data.lawyers) ? data.lawyers : []);
    renderClients(data && Array.isArray(data.clients) ? data.clients : []);
}

window.addEventListener("DOMContentLoaded", async () => {
    try{
        await loadContacts();
    }catch(err){
        alert(err.message || "Failed to load contacts");
    }
});
