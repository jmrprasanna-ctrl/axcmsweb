const params = new URLSearchParams(window.location.search);
const customerId = params.get("id");
const uppercaseFields = ["name", "address", "quotation2Address", "comment"];
const role = (localStorage.getItem("role") || "").toLowerCase();
const selectedDb = (localStorage.getItem("selectedDatabaseName") || "").toLowerCase();
const isTrainingUser = role === "user" && selectedDb === "demo";
const canManage = role === "admin" || role === "manager" || isTrainingUser;
const canDeleteCustomer = canManage || (role === "user" && typeof hasUserActionPermission === "function" && hasUserActionPermission("/customers/client-list.html", "delete"));

uppercaseFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if(!field) return;
    field.addEventListener("input", () => {
        field.value = field.value.toUpperCase();
    });
});

if(!customerId){
    alert("Missing customer id.");
    window.location.href = "client-list.html";
}

async function loadCustomer(){
    try{
        const customer = await request(`/customers/${customerId}`,"GET");
        document.getElementById("name").value = (customer.name || "").toUpperCase();
        document.getElementById("address").value = (customer.address || "").toUpperCase();
        document.getElementById("quotation2Address").value = (customer.quotation2_address || "").toUpperCase();
        document.getElementById("tel").value = customer.tel || "";
        document.getElementById("mobile").value = customer.mobile || "";
        document.getElementById("contactPerson").value = customer.contact_person || "";
        document.getElementById("email").value = customer.email || "";
        document.getElementById("comment").value = (customer.comment || "").toUpperCase();
    }catch(err){
        alert(err.message || "Failed to load customer");
        window.location.href = "client-list.html";
    }
}

async function deleteCustomer(){
    if(!canDeleteCustomer){
        alert("You do not have permission to delete customers.");
        return;
    }
    if(!confirm("Delete this customer?")) return;
    try{
        await request(`/customers/${customerId}`,"DELETE");
        showMessageBox("Customer deleted");
        window.location.href = "client-list.html";
    }catch(err){
        alert(err.message || "Failed to delete customer");
    }
}

document.getElementById("customerForm").addEventListener("submit", async function(e){
    e.preventDefault();
    const data = {
        name: document.getElementById("name").value.trim().toUpperCase(),
        address: document.getElementById("address").value.trim().toUpperCase(),
        quotation2_address: document.getElementById("quotation2Address").value.trim().toUpperCase(),
        tel: document.getElementById("tel").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        contact_person: document.getElementById("contactPerson").value.trim(),
        email: document.getElementById("email").value.trim(),
        comment: document.getElementById("comment").value.trim()
    };

    try{
        await request(`/customers/${customerId}`,"PUT",data);
        showMessageBox("Customer updated successfully!");
    }catch(err){
        alert(err.message || "Failed to update customer");
    }
});

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}

const deleteCustomerBtn = document.getElementById("deleteCustomerBtn");
if(deleteCustomerBtn){
    if(!canDeleteCustomer){
        deleteCustomerBtn.style.display = "none";
    }else{
        deleteCustomerBtn.addEventListener("click", deleteCustomer);
    }
}

loadCustomer();

