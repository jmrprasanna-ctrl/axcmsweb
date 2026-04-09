const role = (localStorage.getItem("role") || "").toLowerCase();
const selectedDb = (localStorage.getItem("selectedDatabaseName") || "").toLowerCase();
const isTrainingUser = role === "user" && selectedDb === "demo";
const canManage = role === "admin" || role === "manager" || isTrainingUser;
const allowedPaths = (() => {
    try{
        const rows = JSON.parse(localStorage.getItem("userAllowedPathsRuntime") || "[]");
        return new Set((Array.isArray(rows) ? rows : []).map((x) => String(x || "").trim().toLowerCase()));
    }catch(_err){
        return new Set();
    }
})();
const canAccessPath = (path) => canManage
    ? true
    : (role === "user" && allowedPaths.has(String(path || "").trim().toLowerCase()));
const canEditCustomer = canManage || (role === "user" && typeof hasUserActionPermission === "function" && hasUserActionPermission("/clients/client-list.html", "edit"));
const customerSearchEl = document.getElementById("customerSearch");
const exportPdfBtn = document.getElementById("exportPdfBtn");
let allCustomers = [];

function renderCustomers(customers){
    const tbody = document.querySelector("#customerTable tbody");
    tbody.innerHTML = "";
    customers.forEach(c=>{
        const tr = document.createElement("tr");
        if(canEditCustomer){
            tr.classList.add("customer-row-clickable");
            tr.addEventListener("click", () => {
                window.location.href = `edit-customer.html?id=${c.id}`;
            });
        }
        tr.innerHTML = `
            <td>${c.customer_id || ""}</td>
            <td>${c.name}</td>
            <td>${c.address}</td>
            <td>${c.tel}</td>
            <td>${c.mobile || ""}</td>
            <td>${c.email}</td>
        `;
        tbody.appendChild(tr);
    });
}

function applyCustomerFilter(){
    const query = (customerSearchEl?.value || "").trim().toLowerCase();
    if(!query){
        renderCustomers(allCustomers);
        return;
    }
    const filtered = allCustomers.filter(c => {
        return [c.customer_id, c.name, c.tel, c.mobile, c.email].some(v => String(v || "").toLowerCase().includes(query));
    });
    renderCustomers(filtered);
}

async function loadCustomers(){
    try{
        allCustomers = await request("/clients","GET");
        applyCustomerFilter();
    }catch(err){
        alert("Failed to load customers");
    }
}

if(customerSearchEl){
    customerSearchEl.addEventListener("input", applyCustomerFilter);
}
if(exportPdfBtn){
    exportPdfBtn.addEventListener("click", exportPDF);
}

function exportPDF(){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "a4" });
    doc.setFontSize(10);
    doc.text("Client List",14,20);
    let y = 30;
    const rows = document.querySelectorAll("#customerTable tbody tr");
    rows.forEach(r=>{
        const cells = Array.from(r.children).slice(0, 5).map(td=>td.innerText);
        doc.text(cells.join(" | "),14,y);
        y+=8;
    });
    doc.save("Client_List.pdf");
}

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}

loadCustomers();

