let customersCache = [];

const SERVICE_OPTIONS = [
    "Profesionl Fee",
    "Document Filling",
    "Plaint Filing",
    "Plaint Documet",
    "Anwer Filing",
    "Answer Document",
    "L/W Filing",
    "L/W Document"
];

function money(value) {
    return Number(value || 0).toFixed(2);
}

function setTodayIfEmpty() {
    const invoiceDateEl = document.getElementById("invoiceDate");
    if (!invoiceDateEl.value) {
        invoiceDateEl.value = new Date().toISOString().slice(0, 10);
    }
}

function clearCustomerDetails() {
    document.getElementById("address").value = "";
    document.getElementById("email").value = "";
    document.getElementById("tel").value = "";
    const vatNoEl = document.getElementById("vatNo");
    const vatWrapEl = document.getElementById("vatNoWrap");
    const vatValueEl = document.getElementById("vatValue");
    const vatValueWrapEl = document.getElementById("vatValueWrap");
    if (vatNoEl) vatNoEl.value = "";
    if (vatWrapEl) vatWrapEl.classList.add("is-hidden");
    if (vatValueEl) vatValueEl.value = "0";
    if (vatValueWrapEl) vatValueWrapEl.classList.add("is-hidden");
}

function fillCustomerDetails(customerId) {
    const customer = customersCache.find((c) => Number(c.id) === Number(customerId));
    if (!customer) {
        clearCustomerDetails();
        return;
    }

    document.getElementById("address").value = customer.address || "";
    document.getElementById("email").value = customer.email || "";
    document.getElementById("tel").value = customer.tel || "";

    const vatNoEl = document.getElementById("vatNo");
    const vatWrapEl = document.getElementById("vatNoWrap");
    const vatValueWrapEl = document.getElementById("vatValueWrap");
    const mode = String(customer.customer_mode || "").toLowerCase();
    const vatNo = String(customer.vat_number || "").trim();
    const showVat = mode === "vat";

    if (vatNoEl) vatNoEl.value = vatNo;
    if (vatWrapEl) vatWrapEl.classList.toggle("is-hidden", !showVat);
    if (vatValueWrapEl) vatValueWrapEl.classList.toggle("is-hidden", !showVat);
}

async function loadCustomers() {
    const rows = await request("/clients", "GET");
    customersCache = Array.isArray(rows) ? rows : [];
    const customerEl = document.getElementById("customer");
    customerEl.innerHTML = `<option value="">Select Customer</option>`;

    customersCache.forEach((cust) => {
        const opt = document.createElement("option");
        opt.value = String(cust.id);
        opt.innerText = `${cust.name} - ${cust.customer_id || ""}`.trim();
        customerEl.appendChild(opt);
    });
}

function serviceOptionsMarkup(selectedValue = "") {
    const selected = String(selectedValue || "").trim().toLowerCase();
    const options = SERVICE_OPTIONS.map((label) => {
        const isSelected = selected === String(label).trim().toLowerCase();
        return `<option value="${label}" ${isSelected ? "selected" : ""}>${label}</option>`;
    }).join("");
    return `<option value="">Select Description</option>${options}`;
}

function recalculateServiceTotal() {
    const rows = Array.from(document.querySelectorAll("#serviceLinesTable tbody tr"));
    const total = rows.reduce((sum, row) => {
        const amountEl = row.querySelector(".service-amount");
        const amount = Number(amountEl?.value || 0);
        return sum + (Number.isFinite(amount) && amount >= 0 ? amount : 0);
    }, 0);
    const totalEl = document.getElementById("invoiceServicesTotal");
    if (totalEl) totalEl.textContent = money(total);
}

function refreshLineNumbers() {
    const rows = Array.from(document.querySelectorAll("#serviceLinesTable tbody tr"));
    rows.forEach((row, idx) => {
        const idxEl = row.querySelector(".line-no");
        if (idxEl) idxEl.textContent = String(idx + 1);
    });
}

function addServiceRow(initial = {}) {
    const tbody = document.querySelector("#serviceLinesTable tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.className = "invoice-service-row";
    tr.innerHTML = `
        <td class="line-no"></td>
        <td>
            <select class="service-description" required>
                ${serviceOptionsMarkup(initial.description || "")}
            </select>
        </td>
        <td>
            <input class="service-amount" type="number" min="0" step="0.01" value="${Number(initial.amount || 0)}" placeholder="0.00" required>
        </td>
        <td>
            <button class="icon-btn delete-line-icon-btn service-remove-btn" type="button" title="Delete" aria-label="Delete">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 7h12M9.5 7V5.5h5V7M10 10.5v6M14 10.5v6M7.5 7l.7 10.2a1.5 1.5 0 0 0 1.5 1.4h4.6a1.5 1.5 0 0 0 1.5-1.4L16.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>
            </button>
        </td>
    `;

    const removeBtn = tr.querySelector(".service-remove-btn");
    const amountEl = tr.querySelector(".service-amount");
    const descEl = tr.querySelector(".service-description");

    removeBtn.addEventListener("click", () => {
        tr.remove();
        if (!document.querySelector("#serviceLinesTable tbody tr")) {
            addServiceRow();
        } else {
            refreshLineNumbers();
            recalculateServiceTotal();
        }
    });

    amountEl.addEventListener("input", recalculateServiceTotal);
    descEl.addEventListener("change", recalculateServiceTotal);

    tbody.appendChild(tr);
    refreshLineNumbers();
    recalculateServiceTotal();
}

function collectServiceItems() {
    const rows = Array.from(document.querySelectorAll("#serviceLinesTable tbody tr"));
    const items = [];

    for (const row of rows) {
        const description = String(row.querySelector(".service-description")?.value || "").trim();
        const amount = Number(row.querySelector(".service-amount")?.value || 0);
        if (!description) {
            throw new Error("Select description for all rows.");
        }
        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error("Enter a valid non-negative amount for all rows.");
        }
        items.push({ description, amount: Number(amount.toFixed(2)) });
    }

    if (!items.length) {
        throw new Error("Add at least one description line.");
    }
    return items;
}

function resetServiceRows() {
    const tbody = document.querySelector("#serviceLinesTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    addServiceRow();
}

async function initInvoicePage() {
    clearCustomerDetails();
    setTodayIfEmpty();
    await loadCustomers();
    resetServiceRows();
}

document.getElementById("customer").addEventListener("change", function () {
    fillCustomerDetails(this.value);
});

document.getElementById("addServiceRowBtn").addEventListener("click", () => {
    addServiceRow();
});

document.getElementById("invoiceForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const customerId = Number(document.getElementById("customer").value);
    const invoiceDate = String(document.getElementById("invoiceDate").value || "").trim();

    if (!customerId || !invoiceDate) {
        alert("Select customer and invoice date.");
        return;
    }

    let serviceItems = [];
    try {
        serviceItems = collectServiceItems();
    } catch (err) {
        alert(err.message || "Check invoice description rows.");
        return;
    }

    const totalAmount = serviceItems.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const descriptionSummary = serviceItems.map((row) => row.description).join(", ");

    try {
        await request("/invoices", "POST", {
            customer_id: customerId,
            invoice_date: invoiceDate,
            amount: Number(totalAmount.toFixed(2)),
            amount_description: descriptionSummary,
            service_items: serviceItems
        });
        showMessageBox("Invoice saved successfully!");
        document.getElementById("invoiceForm").reset();
        clearCustomerDetails();
        setTodayIfEmpty();
        await loadCustomers();
        resetServiceRows();
    } catch (err) {
        alert(err.message || "Failed to save invoice");
    }
});

const backToInvoiceListBtn = document.getElementById("backToInvoiceListBtn");
if (backToInvoiceListBtn) {
    backToInvoiceListBtn.addEventListener("click", () => {
        window.location.href = "invoice-list.html";
    });
}

initInvoicePage().catch((err) => {
    alert(err.message || "Failed to initialize invoice form");
});
