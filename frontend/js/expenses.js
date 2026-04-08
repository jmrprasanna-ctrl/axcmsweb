                             
function requireApiRequest() {
    if (typeof window.request !== "function") {
        throw new Error("API helper not loaded. Expected ../assets/js/api.js before expenses.js");
    }
    return window.request;
}

const getData = (endpoint) => requireApiRequest()(`/${String(endpoint || "").replace(/^\/+/, "")}`, "GET");
const postData = (endpoint, payload) => requireApiRequest()(`/${String(endpoint || "").replace(/^\/+/, "")}`, "POST", payload);
const deleteData = (endpoint) => requireApiRequest()(`/${String(endpoint || "").replace(/^\/+/, "")}`, "DELETE");

const loadExpenses = async () => {
    const expenses = await getData('expenses');
    const tbody = document.getElementById('expense-table-body');
    tbody.innerHTML = '';
    expenses.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${e.id}</td>
            <td>${e.description}</td>
            <td>${e.amount}</td>
            <td>${new Date(e.expense_date).toLocaleDateString()}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteExpense(${e.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
};

window.loadExpenses = loadExpenses;

const addExpense = async () => {
    const expense = {
        description: document.getElementById('description').value,
        amount: document.getElementById('amount').value,
        expense_date: document.getElementById('expense_date').value
    };
    await postData('expenses', expense);
    loadExpenses();
};

window.addExpense = addExpense;

const deleteExpense = async (id) => {
    if (confirm('Are you sure?')) {
        await deleteData(`expenses/${id}`);
        loadExpenses();
    }
};

window.deleteExpense = deleteExpense;
