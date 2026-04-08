const params = new URLSearchParams(window.location.search);
const expenseId = params.get("id");
const role = (localStorage.getItem("role") || "").toLowerCase();
const selectedDb = (localStorage.getItem("selectedDatabaseName") || "").toLowerCase();
const isTrainingUser = role === "user" && selectedDb === "demo";
const canManage = role === "admin" || role === "manager" || isTrainingUser;
const canDeleteExpense = canManage || (role === "user" && typeof hasUserActionPermission === "function" && hasUserActionPermission("/expenses/expense-list.html", "delete"));
const deleteExpenseBtn = document.getElementById("deleteExpenseBtn");

if(!expenseId){
    alert("Missing expense id.");
    window.location.href = "expense-list.html";
}

if(deleteExpenseBtn && !canDeleteExpense){
    deleteExpenseBtn.style.display = "none";
}

async function loadExpense(){
    try{
        const expense = await request(`/expenses/${expenseId}`,"GET");
        document.getElementById("title").value = expense.title || "";
        document.getElementById("client").value = expense.client || expense.customer || "";
        document.getElementById("amount").value = expense.amount || 0;
        const dateVal = expense.date ? new Date(expense.date) : new Date();
        const tzOffset = dateVal.getTimezoneOffset() * 60000;
        const localISOTime = new Date(dateVal - tzOffset).toISOString().slice(0,16);
        document.getElementById("date").value = localISOTime;
        document.getElementById("category").value = expense.category || "";
    }catch(err){
        alert(err.message || "Failed to load expense");
        window.location.href = "expense-list.html";
    }
}

document.getElementById("expenseForm").addEventListener("submit", async function(e){
    e.preventDefault();
    const data = {
        title: document.getElementById("title").value.trim(),
        client: document.getElementById("client").value.trim(),
        customer: document.getElementById("client").value.trim(),
        amount: parseFloat(document.getElementById("amount").value),
        date: document.getElementById("date").value,
        category: document.getElementById("category").value.trim()
    };

    try{
        await request(`/expenses/${expenseId}`,"PUT",data);
        showMessageBox("Expense updated successfully!");
    }catch(err){
        alert(err.message || "Failed to update expense");
    }
});

if(deleteExpenseBtn){
    deleteExpenseBtn.addEventListener("click", async () => {
        if(!canDeleteExpense){
            alert("You do not have permission to delete expenses.");
            return;
        }
        if(!confirm("Delete this expense?")) return;
        try{
            await request(`/expenses/${expenseId}`,"DELETE");
            showMessageBox("Expense deleted");
            window.location.href = "expense-list.html";
        }catch(err){
            alert(err.message || "Failed to delete expense");
        }
    });
}

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}

loadExpense();
