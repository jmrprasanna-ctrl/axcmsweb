let allInvoices = [];

function fmtDate(value){
    const dt = new Date(value);
    if(Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleDateString("en-GB");
}

function fmtMoney(value){
    return Number(value || 0).toFixed(2);
}

function openInvoice(invoiceId){
    if(!invoiceId) return;
    window.location.href = `view-invoice.html?id=${encodeURIComponent(String(invoiceId))}`;
}

function renderInvoices(rows){
    const tbody = document.querySelector("#invoiceTable tbody");
    if(!tbody) return;
    tbody.innerHTML = "";
    rows.forEach((inv) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${inv.invoice_no || ""}</td>
            <td>${fmtDate(inv.invoice_date)}</td>
            <td>${inv.customer_name || ""}</td>
            <td>${inv.amount_description || ""}</td>
            <td class="amount-col">${fmtMoney(inv.amount)}</td>
            <td>${inv.payment_status || ""}</td>
        `;
        tr.addEventListener("click", () => openInvoice(inv.id));
        tbody.appendChild(tr);
    });
}

function applySearch(){
    const searchEl = document.getElementById("invoiceSearch");
    const query = String(searchEl?.value || "").trim().toLowerCase();
    if(!query){
        renderInvoices(allInvoices);
        return;
    }
    const filtered = allInvoices.filter((inv) => {
        return [
            inv.invoice_no,
            inv.customer_name,
            inv.amount_description,
            inv.payment_status,
            inv.amount
        ].some((v) => String(v || "").toLowerCase().includes(query));
    });
    renderInvoices(filtered);
}

async function loadInvoices(){
    const rows = await request("/invoices", "GET");
    allInvoices = Array.isArray(rows) ? rows : [];
    applySearch();
}

function applyAddButtonPermission(){
    const addBtn = document.getElementById("addInvoiceBtn");
    if(!addBtn) return;
    const role = String(localStorage.getItem("role") || "").toLowerCase();
    if(role === "admin" || role === "manager") return;
    if(typeof hasUserActionPermission === "function" && hasUserActionPermission("/invoices/create-invoice.html", "add")){
        return;
    }
    addBtn.style.display = "none";
}

document.addEventListener("DOMContentLoaded", async () => {
    const searchEl = document.getElementById("invoiceSearch");
    if(searchEl){
        searchEl.addEventListener("input", applySearch);
    }
    applyAddButtonPermission();
    try{
        await loadInvoices();
    }catch(err){
        alert(err.message || "Failed to load invoices");
    }
});
