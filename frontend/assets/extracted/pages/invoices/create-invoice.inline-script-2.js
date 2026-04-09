let customersCache = [];

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

async function initInvoicePage() {
    clearCustomerDetails();
    setTodayIfEmpty();
    await loadCustomers();
}

document.getElementById("customer").addEventListener("change", function () {
    fillCustomerDetails(this.value);
});

document.getElementById("invoiceForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const customerId = Number(document.getElementById("customer").value);
    const invoiceDate = String(document.getElementById("invoiceDate").value || "").trim();

    if (!customerId || !invoiceDate) {
        alert("Select customer and invoice date.");
        return;
    }

    try {
        await request("/invoices", "POST", {
            customer_id: customerId,
            invoice_date: invoiceDate
        });
        showMessageBox("Invoice saved successfully!");
        document.getElementById("invoiceForm").reset();
        clearCustomerDetails();
        setTodayIfEmpty();
        await loadCustomers();
    } catch (err) {
        alert(err.message || "Failed to save invoice");
    }
});

const backToInvoiceListBtn = document.getElementById("backToInvoiceListBtn");
if (backToInvoiceListBtn) {
    backToInvoiceListBtn.addEventListener("click", () => {
        window.location.href = "view-invoice.html";
    });
}

initInvoicePage().catch((err) => {
    alert(err.message || "Failed to initialize invoice form");
});
