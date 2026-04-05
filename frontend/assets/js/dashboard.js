                                  
const storedRole = localStorage.getItem("role") || "";
const storedEmail = localStorage.getItem("userEmail") || "";
const storedName = localStorage.getItem("userName") || "";
let storedProfilePicturePath = localStorage.getItem("userProfilePictureUrl") || "";
const displayName = storedName || storedEmail || storedRole || "User";
const MENU_AVATAR_PLACEHOLDER = "../assets/images/profile-placeholder.svg";

const roleEl = document.getElementById("userRole");
if (roleEl) roleEl.innerText = storedRole;

const nameEl = document.getElementById("userName");
if (nameEl) nameEl.innerText = displayName;

const initialEl = document.getElementById("userInitial");
if (initialEl) {
    const initialSource = displayName.trim();
    initialEl.innerText = initialSource ? initialSource[0].toUpperCase() : "U";
}
const menuNameEl = document.getElementById("userMenuName");
if(menuNameEl){
    menuNameEl.innerText = displayName;
}
const menuRoleEl = document.getElementById("userMenuRole");
if(menuRoleEl){
    menuRoleEl.innerText = storedRole || "User";
}
const menuInitialEl = document.getElementById("userMenuInitial");
if(menuInitialEl){
    const initialSource = displayName.trim();
    menuInitialEl.innerText = initialSource ? initialSource[0].toUpperCase() : "U";
}

function applyUserAvatarImage() {
    const menuAvatarEl = document.getElementById("userMenuInitial");
    const menuBtn = document.getElementById("userMenuBtn");
    if(!menuAvatarEl || !menuBtn) return;
    const raw = String(storedProfilePicturePath || "").trim();
    const menuButtonDefaultIcon = `
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" fill="none" stroke="currentColor" stroke-width="1.7"/>
            <path d="M4.3 20.1a7.7 7.7 0 0 1 15.4 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
    `;
    if(!raw){
        menuAvatarEl.classList.remove("has-image");
        const initialSource = displayName.trim();
        menuAvatarEl.textContent = initialSource ? initialSource[0].toUpperCase() : "U";
        menuBtn.classList.remove("has-image");
        menuBtn.innerHTML = menuButtonDefaultIcon;
        return;
    }
    const apiOrigin = String(BASE_URL || "").replace(/\/api\/?$/i, "").replace(/\/+$/, "");
    const absolute = /^data:image\//i.test(raw)
        ? raw
        : (/^https?:\/\//i.test(raw)
            ? raw
            : `${apiOrigin}${raw.startsWith("/") ? "" : "/"}${raw}`);
    const safeAvatar = absolute || MENU_AVATAR_PLACEHOLDER;

    menuAvatarEl.classList.add("has-image");
    menuAvatarEl.innerHTML = `<img src="${safeAvatar}" alt="Profile" class="user-menu-head-avatar-img">`;
    const menuHeadImg = menuAvatarEl.querySelector("img");
    if (menuHeadImg) {
        menuHeadImg.onerror = () => {
            menuAvatarEl.classList.remove("has-image");
            const initialSource = displayName.trim();
            menuAvatarEl.textContent = initialSource ? initialSource[0].toUpperCase() : "U";
        };
    }

    menuBtn.classList.add("has-image");
    menuBtn.innerHTML = `<img src="${safeAvatar}" alt="Profile" class="user-menu-btn-avatar-img">`;
    const btnImg = menuBtn.querySelector("img");
    if (btnImg) {
        btnImg.onerror = () => {
            menuBtn.classList.remove("has-image");
            menuBtn.innerHTML = menuButtonDefaultIcon;
        };
    }
}

async function hydrateAvatarFromProfiles() {
    try {
        const rows = await request("/users/profiles", "GET");
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) return;
        const userId = Number(localStorage.getItem("userId") || 0);
        const email = String(localStorage.getItem("userEmail") || "").trim().toLowerCase();
        const username = String(localStorage.getItem("userName") || "").trim().toLowerCase();

        const match = list.find((p) => Number(p.user_id || 0) === userId)
            || list.find((p) => String(p.email || "").trim().toLowerCase() === email)
            || list.find((p) => String(p.login_user || "").trim().toLowerCase() === username)
            || list.find((p) => String(p.login_user || "").trim().toLowerCase() === email);

        const bestAvatar = match
            ? String(match.profile_picture_data_url || match.profile_picture_url || match.profile_picture_api_url || "").trim()
            : "";
        if (bestAvatar) {
            storedProfilePicturePath = bestAvatar;
            localStorage.setItem("userProfilePictureUrl", storedProfilePicturePath);
            applyUserAvatarImage();
        }
    } catch (_err) {
    }
}

const userRole = (storedRole || "").toLowerCase();

if(userRole === "manager"){
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

function hasDashboardAccessFor(path, actions = ["view"]){
    const target = String(path || "").trim();
    if(!target) return false;
    if(typeof hasUserGrantedPath === "function" && hasUserGrantedPath(target)){
        return true;
    }
    if(typeof hasUserActionPermission === "function"){
        return actions.some((action) => hasUserActionPermission(target, action));
    }
    return true;
}

function syncDashboardCommunicationButtons(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "admin" && role !== "manager" && role !== "user") return;

    const messagesBtn = document.getElementById("messagesBtn");
    const noticeBtn = document.getElementById("noticeBtn");
    const todoBtn = document.getElementById("todoBtn");

    if(messagesBtn){
        const allowMessages = hasDashboardAccessFor("/messages/messages.html", ["view", "add", "delete"]);
        messagesBtn.style.display = allowMessages ? "" : "none";
    }

    if(noticeBtn){
        const allowNotifications = hasDashboardAccessFor("/notifications/notifications.html", ["view", "add", "delete"]);
        noticeBtn.style.display = allowNotifications ? "" : "none";
    }

    if(todoBtn){
        const allowTodo = hasDashboardAccessFor("/calendar.html", ["view"]);
        todoBtn.style.display = allowTodo ? "" : "none";
    }
}

if(window.__userAccessPermissionsLoaded){
    syncDashboardCommunicationButtons();
}else{
    document.addEventListener("app:user-access-ready", syncDashboardCommunicationButtons, { once: true });
}

function normalizeAccessPath(path){
    return `/${String(path || "").trim().toLowerCase().replace(/\\/g, "/").replace(/^\/+/, "")}`;
}

function toDashboardMenuHref(canonicalPath){
    const clean = String(canonicalPath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if(!clean) return "#";
    return clean;
}

const DASHBOARD_MENU_ENTRIES = [
    { path: "/dashboard.html", label: "Dashboard" },
    { path: "/calendar.html", label: "Calender" },
    { path: "/customers/client-list.html", label: "Client" },
    { path: "/cases/case-list.html", label: "Cases" },
    { path: "/cases/finished.html", label: "Finished" },
    { path: "/invoices/Payments-list.html", label: "Invoices" },
    { path: "/expenses/expense-list.html", label: "Expenses" },
    { path: "/finance/finance.html", label: "Finance" },
    { path: "/users/user-list.html", label: "Users" }
];
let dashboardAllowedMenuEntries = null;
let lastDashboardMenuSignature = "";

function renderDashboardSidebarMenu(entries){
    const nav = document.querySelector(".sidebar .nav-links, .sidebar ul");
    if(!nav) return;
    const safeEntries = Array.isArray(entries) && entries.length
        ? entries
        : [{ path: "/dashboard.html", label: "Dashboard" }];
    const signature = safeEntries.map((e) => normalizeAccessPath(e.path)).join("|");
    if(signature === lastDashboardMenuSignature) return;
    lastDashboardMenuSignature = signature;
    nav.innerHTML = safeEntries
        .map((e) => `<li><a href="${toDashboardMenuHref(e.path)}">${e.label}</a></li>`)
        .join("");
}

function enforceDashboardSidebarAccess(){
    // Sidebar rendering is centralized in assets/js/api.js
    // to keep behavior consistent on all pages.
    return;
}

function startDashboardSidebarGuard(){
    return;
}

         
function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("selectedDatabaseName");
    localStorage.removeItem("mappedCompanyName");
    localStorage.removeItem("mappedCompanyLogoUrl");
    localStorage.removeItem("userProfilePictureUrl");
    window.location.href = "login.html";
}

function closeUserMenu(){
    const menu = document.getElementById("userMenu");
    const btn = document.getElementById("userMenuBtn");
    const wrap = document.querySelector(".user-menu-wrap");
    if(menu){
        menu.classList.add("hidden");
    }
    if(btn){
        btn.setAttribute("aria-expanded", "false");
    }
    if(wrap){
        wrap.classList.remove("is-open");
    }
}

function openUserMenu(){
    const menu = document.getElementById("userMenu");
    const btn = document.getElementById("userMenuBtn");
    const wrap = document.querySelector(".user-menu-wrap");
    if(menu){
        menu.classList.remove("hidden");
    }
    if(btn){
        btn.setAttribute("aria-expanded", "true");
    }
    if(wrap){
        wrap.classList.add("is-open");
    }
}

function toggleUserMenu(){
    const menu = document.getElementById("userMenu");
    if(!menu) return;
    if(menu.classList.contains("hidden")){
        openUserMenu();
    }else{
        closeUserMenu();
    }
}

function openMyProfile(){
    const userId = Number(localStorage.getItem("userId") || 0);
    if(Number.isFinite(userId) && userId > 0){
        window.location.href = `users/edit-user.html?id=${userId}`;
        return;
    }
    window.location.href = "users/user-list.html";
}

function openPreferencePage(){
    window.location.href = "users/preference.html";
}

function initUserMenu(){
    const menuWrap = document.querySelector(".user-menu-wrap");
    const menuBtn = document.getElementById("userMenuBtn");
    const profileItem = document.getElementById("profileMenuItem");
    const preferenceItem = document.getElementById("preferenceMenuItem");
    const logoutItem = document.getElementById("logoutMenuItem");

    if(!menuWrap || !menuBtn) return;

    menuBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleUserMenu();
    });

    if(profileItem){
        profileItem.addEventListener("click", () => {
            closeUserMenu();
            openMyProfile();
        });
    }

    if(preferenceItem){
        preferenceItem.addEventListener("click", () => {
            closeUserMenu();
            openPreferencePage();
        });
    }

    if(logoutItem){
        logoutItem.addEventListener("click", () => {
            closeUserMenu();
            logout();
        });
    }

    document.addEventListener("click", (event) => {
        if(!menuWrap.contains(event.target)){
            closeUserMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if(event.key === "Escape"){
            closeUserMenu();
        }
    });
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function formatDateWithWeekday(dateText){
    const fallbackDate = new Date();
    const d = dateText ? new Date(`${dateText}T00:00:00`) : fallbackDate;
    if(Number.isNaN(d.getTime())){
        const safe = fallbackDate.toISOString().slice(0,10);
        const weekday = fallbackDate.toLocaleDateString("en-US", { weekday: "long" });
        return `${safe} ${weekday}`;
    }
    const safe = dateText || d.toISOString().slice(0,10);
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
    return `${safe} ${weekday}`;
}

function formatLocalDateLine(now){
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const weekday = weekdays[now.getDay()];
    return `${year}-${month}-${day} ${weekday}`;
}

function formatLocalTimeLine(now){
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function startDashboardDateTimeClock(){
    const dateEl = document.getElementById("currentDateText");
    const timeEl = document.getElementById("currentTimeText");
    if(!dateEl || !timeEl) return;

    const tick = () => {
        const now = new Date();
        dateEl.innerText = formatLocalDateLine(now);
        timeEl.innerText = formatLocalTimeLine(now);
    };

    tick();
    window.setInterval(tick, 1000);
}

function formatAmountWithSeparators(value){
    return Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function setCardValue(cardId, value){
    const cardEl = document.getElementById(cardId);
    if(!cardEl) return;
    const valueEl = cardEl.querySelector("p");
    if(!valueEl) return;
    valueEl.innerText = value;
}

                     
function escapeHtml(value){
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function renderUpcomingCases(rows){
    const bodyEl = document.getElementById("upcomingCasesBody");
    if(!bodyEl) return;
    const list = Array.isArray(rows) ? rows : [];
    if(!list.length){
        bodyEl.innerHTML = `
            <tr>
                <td colspan="6" class="upcoming-empty">No onway cases for the next 3 days.</td>
            </tr>
        `;
        return;
    }
    bodyEl.innerHTML = list.map((row) => `
        <tr>
            <td>${escapeHtml(row.next_date || "")}</td>
            <td>${escapeHtml(row.case_no || "")}</td>
            <td>${escapeHtml(row.customer_name || "")}</td>
            <td>${escapeHtml(row.court || "")}</td>
            <td>${escapeHtml(row.step || "Step")}</td>
            <td>${escapeHtml(row.attend_lawyer || "")}</td>
        </tr>
    `).join("");
}

// Fetch summary data
async function fetchSummary(){
    try{
        const periodEl = document.getElementById("summaryPeriod");
        const dateEl = document.getElementById("summaryDate");
        const period = periodEl ? periodEl.value : "day";
        const date = dateEl ? dateEl.value : "";
        const query = `?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`;
        const summary = await request(`/dashboard/summary${query}`,"GET");

        setCardValue("totalUsers", summary.totalUsers || 0);
        setCardValue("totalCases", summary.totalCases || 0);
        setCardValue("totalCustomers", summary.totalCustomers || 0);
        setCardValue("totalVendors", summary.totalVendors || 0);
                                            
        // Total Sales: invoice totals only.
        const salesVal = summary.totalSalesPeriod ?? summary.totalSales ?? 0;
        const receivedPaymentVal = summary.receivedPaymentPeriod ?? summary.receivedPayment ?? 0;
        const expenseVal = summary.totalExpensesPeriod ?? summary.totalExpenses ?? 0;
        const profitVal = summary.netProfitPeriod ?? summary.netProfit ?? (Number(receivedPaymentVal || 0) - Number(expenseVal || 0));
        setCardValue("totalSales", formatAmountWithSeparators(salesVal));
        setCardValue("receivedPayment", formatAmountWithSeparators(receivedPaymentVal));
        setCardValue("totalExpenses", formatAmountWithSeparators(expenseVal));
        setCardValue("netProfit", formatAmountWithSeparators(profitVal));
        const labelEl = document.getElementById("summaryRangeLabel");
        if(labelEl){
            const periodName = (summary.period || period || "day").toString().toLowerCase();
            const dateText = date || "";
            if(periodName === "week"){
                labelEl.innerText = dateText ? `Week of ${dateText}` : "This Week";
            }else if(periodName === "month"){
                labelEl.innerText = dateText ? `Month of ${dateText.slice(0,7)}` : "This Month";
            }else if(periodName === "year"){
                labelEl.innerText = dateText ? `Year: ${dateText.slice(0,4)}` : "This Year";
            }else{
                labelEl.innerText = formatDateWithWeekday(dateText);
            }
        }
        renderUpcomingCases(summary.upcomingCasesNext3Days || []);

    }catch(err){
        console.error(err);
        alert(err.message || "Failed to load dashboard data");
        if ((err.message || "").toLowerCase().includes("login") || (err.message || "").toLowerCase().includes("token")) {
            window.location.href = "login.html";
        }
    }
}

function populateSummaryYearOptions(){
    const yearEl = document.getElementById("summaryYearSelect");
    if(!yearEl) return;
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 15;
    const opts = [];
    for(let y = currentYear; y >= startYear; y--){
        opts.push(`<option value="${y}">${y}</option>`);
    }
    yearEl.innerHTML = opts.join("");
}

function populateSummaryMonthOptions(){
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!monthEl) return;
    monthEl.innerHTML = MONTH_NAMES
        .map((name, i) => `<option value="${String(i + 1).padStart(2,"0")}">${name}</option>`)
        .join("");
}

function syncSummaryDateFromSelectors(){
    const periodEl = document.getElementById("summaryPeriod");
    const dateEl = document.getElementById("summaryDate");
    const yearEl = document.getElementById("summaryYearSelect");
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!periodEl || !dateEl) return;

    const period = (periodEl.value || "day").toLowerCase();
    const year = (yearEl && yearEl.value) ? yearEl.value : String(new Date().getFullYear());
    const month = (monthEl && monthEl.value) ? monthEl.value : String(new Date().getMonth() + 1).padStart(2,"0");

    if(period === "year"){
        dateEl.value = `${year}-01-01`;
    }else if(period === "month"){
        dateEl.value = `${year}-${month}-01`;
    }else if(!dateEl.value){
        dateEl.value = new Date().toISOString().slice(0,10);
    }
}

function toggleSummaryExtraSelectors(){
    const periodEl = document.getElementById("summaryPeriod");
    const dateEl = document.getElementById("summaryDate");
    const yearEl = document.getElementById("summaryYearSelect");
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!periodEl || !dateEl || !yearEl || !monthEl) return;

    const period = (periodEl.value || "day").toLowerCase();
    const showYear = period === "year" || period === "month";
    const showMonth = period === "month";

    yearEl.style.display = showYear ? "" : "none";
    monthEl.style.display = showMonth ? "" : "none";
    dateEl.style.display = period === "day" ? "" : "none";
}

             
const summaryDateEl = document.getElementById("summaryDate");
if(summaryDateEl){
    summaryDateEl.value = new Date().toISOString().slice(0,10);
}
const summaryPeriodEl = document.getElementById("summaryPeriod");
const summaryYearEl = document.getElementById("summaryYearSelect");
const summaryMonthEl = document.getElementById("summaryMonthSelect");

populateSummaryYearOptions();
populateSummaryMonthOptions();
if(summaryYearEl && !summaryYearEl.value){
    summaryYearEl.value = String(new Date().getFullYear());
}
if(summaryMonthEl && !summaryMonthEl.value){
    summaryMonthEl.value = String(new Date().getMonth() + 1).padStart(2,"0");
}
toggleSummaryExtraSelectors();
syncSummaryDateFromSelectors();

if(summaryPeriodEl){
    summaryPeriodEl.addEventListener("change", () => {
        toggleSummaryExtraSelectors();
        syncSummaryDateFromSelectors();
        fetchSummary();
    });
}
if(summaryYearEl){
    summaryYearEl.addEventListener("change", () => {
        syncSummaryDateFromSelectors();
        fetchSummary();
    });
}
if(summaryMonthEl){
    summaryMonthEl.addEventListener("change", () => {
        syncSummaryDateFromSelectors();
        fetchSummary();
    });
}
if(summaryDateEl){
    summaryDateEl.addEventListener("change", () => {
        const period = summaryPeriodEl ? (summaryPeriodEl.value || "day").toLowerCase() : "day";
        if(period !== "day") return;
        fetchSummary();
    });
}
fetchSummary();
startDashboardSidebarGuard();

function setHealthBadge(id, ok){
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.remove("ok", "fail", "unknown");
    if(ok === true){
        el.classList.add("ok");
        el.innerText = "OK";
        return;
    }
    if(ok === false){
        el.classList.add("fail");
        el.innerText = "Fail";
        return;
    }
    el.classList.add("unknown");
    el.innerText = "Unknown";
}

function setTopbarHealthIndicator(ok){
    const el = document.getElementById("healthIconBtn");
    if(!el) return;
    el.classList.remove("ok", "fail", "unknown");
    if(ok === true){
        el.classList.add("ok");
        el.title = "System health: OK";
        return;
    }
    if(ok === false){
        el.classList.add("fail");
        el.title = "System health: Not OK";
        return;
    }
    el.classList.add("unknown");
    el.title = "System health: Unknown";
}

async function loadHealthStatus(){
    const hasHealthPanel = !!document.getElementById("healthPanel");
    try{
        const health = await request("/health","GET");
        setTopbarHealthIndicator(!!health.ok);
        if(hasHealthPanel && userRole === "admin"){
            setHealthBadge("healthOverall", !!health.ok);
            setHealthBadge("healthDb", !!health.dbConnected);
            setHealthBadge("healthPgDump", !!health?.checks?.tools?.pg_dump?.available);
            setHealthBadge("healthPsql", !!health?.checks?.tools?.psql?.available);
            setHealthBadge("healthTplInvoice", !!health?.checks?.templateFiles?.invoice?.exists);
            setHealthBadge("healthTplQuotation", !!health?.checks?.templateFiles?.quotation?.exists);
            setHealthBadge("healthTplQuotation2", !!health?.checks?.templateFiles?.quotation2?.exists);
        }

        const updated = document.getElementById("healthUpdatedAt");
        if(updated && hasHealthPanel){
            const now = new Date();
            updated.innerText = `Last updated: ${now.toLocaleString()}`;
        }
    }catch(_err){
        setTopbarHealthIndicator(false);
        if(hasHealthPanel && userRole === "admin"){
            setHealthBadge("healthOverall", false);
            setHealthBadge("healthDb", null);
            setHealthBadge("healthPgDump", null);
            setHealthBadge("healthPsql", null);
            setHealthBadge("healthTplInvoice", null);
            setHealthBadge("healthTplQuotation", null);
            setHealthBadge("healthTplQuotation2", null);
        }
    }
}

const healthRefreshBtn = document.getElementById("healthRefreshBtn");
if(healthRefreshBtn){
    healthRefreshBtn.addEventListener("click", loadHealthStatus);
}
loadHealthStatus();
setInterval(loadHealthStatus, 60000);

async function updateBadges(){
    const userId = localStorage.getItem("userId");
    const messageBadge = document.getElementById("messagesBadgeCount");
    const noticeBadge = document.getElementById("noticeBadgeCount");
    const todoBadge = document.getElementById("todoBadgeCount");

    const setBadge = (el, count) => {
        if(!el) return;
        const n = Number(count) || 0;
        if(n > 0){
            el.innerText = n > 99 ? "99+" : String(n);
            el.classList.remove("hidden");
        }else{
            el.innerText = "0";
            el.classList.add("hidden");
        }
    };

    try{
        if(userId && messageBadge){
            const messages = await request(`/messages?to_user_id=${userId}`,"GET");
            const lastSeen = new Date(localStorage.getItem(`messagesLastSeen:${userId}`) || 0);
            const newCount = (Array.isArray(messages) ? messages : [])
                .filter((m) => new Date(m.createdAt) > lastSeen).length;
            setBadge(messageBadge, newCount);
        }
    }catch(_err){
        setBadge(messageBadge, 0);
    }

    try{
        if(noticeBadge){
            const notices = await request("/notifications","GET");
            const lastSeen = new Date(localStorage.getItem(`notificationsLastSeen:${userId}`) || 0);
            const newCount = (Array.isArray(notices) ? notices : [])
                .filter((n) => new Date(n.createdAt) > lastSeen).length;
            setBadge(noticeBadge, newCount);
        }
    }catch(_err){
        setBadge(noticeBadge, 0);
    }

    try{
        if(todoBadge){
            const todos = await request("/todos","GET");
            const undone = (Array.isArray(todos) ? todos : []).filter((t) => !Boolean(t.done)).length;
            setBadge(todoBadge, undone);
        }
    }catch(_err){
        setBadge(todoBadge, 0);
    }
}

updateBadges();
initUserMenu();
startDashboardDateTimeClock();
applyUserAvatarImage();
hydrateAvatarFromProfiles();



