const now = new Date();
const tzOffset = now.getTimezoneOffset() * 60000;
const localISOTime = new Date(now - tzOffset).toISOString().slice(0,16);
document.getElementById("date").value = localISOTime;
const clientSearchEl = document.getElementById("clientSearch");
const clientSearchListEl = document.getElementById("clientSearchList");
const expenseFormEl = document.getElementById("expenseForm");
let allClients = [];
let activeSuggestionIndex = -1;

function setNowDateTime(){
    const base = new Date();
    const offset = base.getTimezoneOffset() * 60000;
    const iso = new Date(base - offset).toISOString().slice(0,16);
    const dateEl = document.getElementById("date");
    if(dateEl) dateEl.value = iso;
}

function escapeHtml(value){
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function hideClientSuggestions(){
    if(clientSearchListEl){
        clientSearchListEl.classList.add("hidden");
        clientSearchListEl.innerHTML = "";
    }
    activeSuggestionIndex = -1;
}

function selectClient(name){
    if(!clientSearchEl) return;
    clientSearchEl.value = String(name || "").trim();
    hideClientSuggestions();
}

function renderClientSuggestions(query){
    if(!clientSearchEl || !clientSearchListEl) return;
    const q = String(query || "").trim().toLowerCase();
    const filtered = q
        ? allClients.filter((name) => name.toLowerCase().includes(q))
        : allClients.slice(0, 15);

    if(!filtered.length){
        clientSearchListEl.innerHTML = `<div class="client-search-empty">No client found.</div>`;
        clientSearchListEl.classList.remove("hidden");
        activeSuggestionIndex = -1;
        return;
    }

    clientSearchListEl.innerHTML = filtered
        .slice(0, 25)
        .map((name, idx) => `<button class="client-search-item${idx === activeSuggestionIndex ? " active" : ""}" type="button" data-client-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
        .join("");
    clientSearchListEl.classList.remove("hidden");
}

async function loadGeneralClients(){
    try{
        const customers = await request("/customers","GET");
        const names = (Array.isArray(customers) ? customers : [])
            .filter((c) => String(c.customer_mode || "").toLowerCase() === "general")
            .map((c) => String(c.name || "").trim())
            .filter(Boolean);
        allClients = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    }catch(err){
        allClients = [];
    }
}

if(clientSearchEl){
    clientSearchEl.addEventListener("focus", () => {
        renderClientSuggestions(clientSearchEl.value);
    });
    clientSearchEl.addEventListener("input", () => {
        activeSuggestionIndex = -1;
        renderClientSuggestions(clientSearchEl.value);
    });
    clientSearchEl.addEventListener("keydown", (event) => {
        if(!clientSearchListEl || clientSearchListEl.classList.contains("hidden")) return;
        const items = Array.from(clientSearchListEl.querySelectorAll(".client-search-item"));
        if(!items.length) return;
        if(event.key === "ArrowDown"){
            event.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            renderClientSuggestions(clientSearchEl.value);
            return;
        }
        if(event.key === "ArrowUp"){
            event.preventDefault();
            activeSuggestionIndex = activeSuggestionIndex <= 0 ? items.length - 1 : activeSuggestionIndex - 1;
            renderClientSuggestions(clientSearchEl.value);
            return;
        }
        if(event.key === "Enter" && activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length){
            event.preventDefault();
            selectClient(items[activeSuggestionIndex].dataset.clientName || "");
            return;
        }
        if(event.key === "Escape"){
            hideClientSuggestions();
        }
    });
}

if(clientSearchListEl){
    clientSearchListEl.addEventListener("click", (event) => {
        const btn = event.target.closest(".client-search-item");
        if(!btn) return;
        selectClient(btn.dataset.clientName || "");
    });
}

document.addEventListener("click", (event) => {
    if(!clientSearchEl || !clientSearchListEl) return;
    if(clientSearchEl.contains(event.target) || clientSearchListEl.contains(event.target)) return;
    hideClientSuggestions();
});

expenseFormEl.addEventListener("submit", async function(e){
    e.preventDefault();
    const clientName = String(clientSearchEl && clientSearchEl.value ? clientSearchEl.value : "").trim();
    const data = {
        title: document.getElementById("title").value.trim(),
        client: clientName,
        customer: clientName,
        amount: parseFloat(document.getElementById("amount").value),
        date: document.getElementById("date").value,
        category: document.getElementById("category").value.trim()
    };

    try{
        await request("/expenses","POST",data);
        showMessageBox("Expense added successfully!");
        expenseFormEl.reset();
        setNowDateTime();
        if(clientSearchEl) clientSearchEl.value = "";
        hideClientSuggestions();
    }catch(err){
        alert(err.message || "Failed to add expense");
    }
});

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}

loadGeneralClients();
