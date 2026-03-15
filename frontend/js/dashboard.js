// Display user role
const dashRole = (localStorage.getItem("role") || "").toLowerCase();
document.getElementById("userRole").innerText = dashRole || "";

if(dashRole === "manager"){
    document.querySelectorAll(".sidebar a").forEach(a=>{
        const href = (a.getAttribute("href") || "").trim();
        if(!href) return;
        const normalized = (href.startsWith("/") ? href : `/${href}`).replace(/\\/g,"/");
        if(normalized.endsWith("/users/user-list.html") || normalized.endsWith("/user-list.html") || normalized.endsWith("/users/add-user.html") || normalized.endsWith("/add-user.html")){
            const li = a.closest("li");
            if(li){
                li.style.display = "none";
            }else{
                a.style.display = "none";
            }
        }
    });
}

if(dashRole === "user"){
    const totalUsersCard = document.getElementById("totalUsers");
    if(totalUsersCard){
        totalUsersCard.style.display = "none";
    }
}

// Logout
function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "login.html";
}

let salesChartInstance = null;
let profitChartInstance = null;

// Fetch summary data
async function fetchSummary(){
    try{
        const periodEl = document.getElementById("summaryPeriod");
        const dateEl = document.getElementById("summaryDate");
        const period = periodEl ? periodEl.value : "day";
        const date = dateEl ? dateEl.value : "";
        const query = `?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`;
        const summary = await request(`/dashboard/summary${query}`,"GET");

        document.getElementById("totalUsers").querySelector("p").innerText = summary.totalUsers || 0;
        const rentalMachinesEl = document.getElementById("totalRentalMachines");
        if(rentalMachinesEl){
            rentalMachinesEl.querySelector("p").innerText = summary.totalRentalMachines || 0;
        }
        document.getElementById("totalProducts").querySelector("p").innerText = summary.totalProducts || 0;
        document.getElementById("totalCustomers").querySelector("p").innerText = summary.totalCustomers || 0;
        const salesVal = summary.totalSalesPeriod ?? summary.totalSales ?? 0;
        const expenseVal = summary.totalExpensesPeriod ?? summary.totalExpenses ?? 0;
        const profitVal = summary.netProfitPeriod ?? summary.netProfit ?? (Number(salesVal) - Number(expenseVal));
        document.getElementById("totalSales").querySelector("p").innerText = Number(salesVal || 0).toFixed(2);
        document.getElementById("totalExpenses").querySelector("p").innerText = Number(expenseVal || 0).toFixed(2);
        document.getElementById("netProfit").querySelector("p").innerText = Number(profitVal || 0).toFixed(2);
        const labelEl = document.getElementById("summaryRangeLabel");
        if(labelEl){
            const periodName = (summary.period || period || "day").toString().toLowerCase();
            const dateText = date || "";
            if(periodName === "week"){
                labelEl.innerText = dateText ? `Week of ${dateText}` : "This Week";
            }else if(periodName === "month"){
                labelEl.innerText = dateText ? `Month of ${dateText.slice(0,7)}` : "This Month";
            }else{
                labelEl.innerText = dateText ? `Day: ${dateText}` : "Today";
            }
        }

        const monthlySales = Array.isArray(summary.monthlySales) ? summary.monthlySales : Array(12).fill(0);
        const monthlyProfit = Array.isArray(summary.monthlyProfit) ? summary.monthlyProfit : Array(12).fill(0);
        const labels = Array.isArray(summary.months) && summary.months.length === 12
            ? summary.months
            : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

        const salesCtx = document.getElementById("salesChart").getContext("2d");
        if(salesChartInstance){
            salesChartInstance.destroy();
        }
        salesChartInstance = new Chart(salesCtx,{
            type:"bar",
            data:{
                labels,
                datasets:[{label:"Sales",data:monthlySales,backgroundColor:"#3498db"}]
            }
        });

        const profitCtx = document.getElementById("profitChart").getContext("2d");
        if(profitChartInstance){
            profitChartInstance.destroy();
        }
        profitChartInstance = new Chart(profitCtx,{
            type:"line",
            data:{
                labels,
                datasets:[{label:"Profit",data:monthlyProfit,borderColor:"#2980b9",fill:false}]
            }
        });

    }catch(err){
        console.error(err);
        alert(err.message || "Failed to load dashboard data");
        if ((err.message || "").toLowerCase().includes("login") || (err.message || "").toLowerCase().includes("token")) {
            window.location.href = "login.html";
        }
    }
}

// Initialize
const summaryDateEl = document.getElementById("summaryDate");
if(summaryDateEl){
    summaryDateEl.value = new Date().toISOString().slice(0,10);
}
const summaryPeriodEl = document.getElementById("summaryPeriod");
if(summaryPeriodEl){
    summaryPeriodEl.addEventListener("change", fetchSummary);
}
if(summaryDateEl){
    summaryDateEl.addEventListener("change", fetchSummary);
}
fetchSummary();

async function loadTodos(){
    const listEl = document.getElementById("todoList");
    if(!listEl) return;
    try{
        const todos = await request("/todos","GET");
        renderTodos(todos || []);
    }catch(err){
        console.error(err);
        listEl.innerHTML = "<li class=\"todo-item\"><span class=\"todo-title\">Failed to load to-do list.</span></li>";
    }
}

async function loadTodoAssignees(){
    const select = document.getElementById("todoAssign");
    if(!select) return;
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "admin" && role !== "manager") return;
    try{
        const users = await request("/users/assignable","GET");
        users.forEach(u=>{
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = u.username || u.email || `User ${u.id}`;
            select.appendChild(opt);
        });
    }catch(err){
        console.error(err);
    }
}

function renderTodos(todos){
    const listEl = document.getElementById("todoList");
    if(!listEl) return;
    const role = (localStorage.getItem("role") || "").toLowerCase();
    listEl.innerHTML = "";
    todos.forEach(todo=>{
        const li = document.createElement("li");
        li.className = "todo-item";
        const titleClass = todo.done ? "todo-title done" : "todo-title";
        const canEdit = role === "admin" || role === "manager";
        li.innerHTML = `
            <div class="todo-main">
                <input type="checkbox" ${todo.done ? "checked" : ""} data-id="${todo.id}">
                <span class="${titleClass}">${todo.title}</span>
            </div>
            <div class="todo-actions">
                ${canEdit ? `<button class="btn btn-secondary" data-action="edit" data-id="${todo.id}">Edit</button>
                <button class="btn btn-danger" data-action="delete" data-id="${todo.id}">Delete</button>` : ""}
            </div>
        `;
        listEl.appendChild(li);
    });

    listEl.querySelectorAll("input[type='checkbox']").forEach(cb=>{
        cb.addEventListener("change", async (e)=>{
            const id = e.target.getAttribute("data-id");
            try{
                await request(`/todos/${id}`,"PUT",{ done: e.target.checked });
                loadTodos();
            }catch(err){
                alert(err.message || "Failed to update to-do");
                e.target.checked = !e.target.checked;
            }
        });
    });

    listEl.querySelectorAll("button[data-action='edit']").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
            const id = btn.getAttribute("data-id");
            const current = btn.closest(".todo-item").querySelector(".todo-title").innerText;
            const next = prompt("Edit to-do", current);
            if(next === null) return;
            const cleaned = String(next).trim();
            if(!cleaned) return;
            try{
                await request(`/todos/${id}`,"PUT",{ title: cleaned });
                loadTodos();
            }catch(err){
                alert(err.message || "Failed to update to-do");
            }
        });
    });

    listEl.querySelectorAll("button[data-action='delete']").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
            const id = btn.getAttribute("data-id");
            if(!confirm("Delete this to-do?")) return;
            try{
                await request(`/todos/${id}`,"DELETE");
                loadTodos();
            }catch(err){
                alert(err.message || "Failed to delete to-do");
            }
        });
    });
}

const todoForm = document.getElementById("todoForm");
if(todoForm){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role === "user"){
        todoForm.style.display = "none";
    }else{
        todoForm.addEventListener("submit", async (e)=>{
            e.preventDefault();
            const input = document.getElementById("todoInput");
            const assignSelect = document.getElementById("todoAssign");
            const title = (input.value || "").trim();
            if(!title) return;
            try{
                const assigned_to = assignSelect && assignSelect.value ? Number(assignSelect.value) : null;
                await request("/todos","POST",{ title, assigned_to });
                input.value = "";
                loadTodos();
            }catch(err){
                alert(err.message || "Failed to add to-do");
            }
        });
    }
}

loadTodoAssignees();
loadTodos();
