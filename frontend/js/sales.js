import { getData, deleteData } from "./api.js";

const loadSales = async () => {
    const sales = await getData("invoices");
    const tbody = document.getElementById("sales-table-body");
    tbody.innerHTML = "";
    sales.forEach(inv => {
        const row = document.createElement("tr");
        const dateText = inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : "";
        row.innerHTML = `
            <td>${inv.invoice_no || ""}</td>
            <td>${inv.customer_name || ""}</td>
            <td>${dateText}</td>
            <td>${inv.total ?? ""}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteSale(${inv.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

window.loadSales = loadSales;

const deleteSale = async (id) => {
    if (!confirm("Are you sure?")) return;
    await deleteData(`invoices/${id}`);
    loadSales();
};

window.deleteSale = deleteSale;
