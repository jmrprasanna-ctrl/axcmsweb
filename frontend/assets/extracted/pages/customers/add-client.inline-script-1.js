const uppercaseFields = ["name", "address", "comment"];

uppercaseFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if(!field) return;
    field.addEventListener("input", () => {
        field.value = field.value.toUpperCase();
    });
});

document.getElementById("customerForm").addEventListener("submit", async function(e){
    e.preventDefault();
    const data = {
        name: document.getElementById("name").value.trim().toUpperCase(),
        address: document.getElementById("address").value.trim().toUpperCase(),
        tel: document.getElementById("tel").value.trim(),
        mobile: document.getElementById("mobile").value.trim(),
        email: document.getElementById("email").value.trim(),
        comment: document.getElementById("comment").value.trim()
    };

    try{
        await request("/clients","POST",data);
        showMessageBox("Client added successfully!");
        document.getElementById("customerForm").reset();
    }catch(err){
        alert(err.message || "Failed to add client");
    }
});

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}
