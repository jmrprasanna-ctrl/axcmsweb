                         
                      
                            
function resolveBaseUrl(){
    const isHttpUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());
    const normalizeApiBase = (value) => {
        const raw = String(value || "").trim().replace(/\/+$/, "");
        if(!raw) return "";
        const lower = raw.toLowerCase();
        if(lower.endsWith("/api")){
            return raw;
        }
        return `${raw}/api`;
    };
    const globalBaseUrl = typeof window !== "undefined" ? window.__API_BASE_URL__ : "";
    const storedBaseUrl = typeof window !== "undefined" ? localStorage.getItem("apiBaseUrl") : "";
    const globalOrigin = typeof window !== "undefined" ? window.__API_ORIGIN__ : "";
    const storedOrigin = typeof window !== "undefined" ? localStorage.getItem("apiOrigin") : "";
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "";
    const fileFallbackOrigin = typeof window !== "undefined"
        ? String(
            window.__FILE_API_ORIGIN__ ||
            localStorage.getItem("fileApiOrigin") ||
            "http://98.92.93.1"
        ).trim()
        : "";

    const candidateBase = String(globalBaseUrl || storedBaseUrl || "").trim();
    if(isHttpUrl(candidateBase)){
        return normalizeApiBase(candidateBase);
    }

    const candidateOrigin = String(globalOrigin || storedOrigin || "").trim();
    if(isHttpUrl(candidateOrigin)){
        return normalizeApiBase(candidateOrigin);
    }

    if(isHttpUrl(browserOrigin)){
        return normalizeApiBase(browserOrigin);
    }

    if(browserProtocol === "file:" && isHttpUrl(fileFallbackOrigin)){
        return normalizeApiBase(fileFallbackOrigin);
    }

    return "http://localhost:5000/api";
}

const BASE_URL = resolveBaseUrl();
window.BASE_URL = BASE_URL;
const GLOBAL_FOOTER_TEXT = "Copyright \u00A9 2026 Powered by CRONIT SOLLUTIONS, All Right Received.";
const UI_SETTINGS_CACHE_KEY = "publicUiSettingsCache";
const USER_UI_SETTINGS_CACHE_KEY = "userUiSettingsCache";
const ENABLE_PUBLIC_UI_SETTINGS_RUNTIME = typeof window !== "undefined" && window.__ENABLE_PUBLIC_UI_SETTINGS__ === true;
const LAST_ACTIVITY_KEY = "lastActivityAt";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "touchstart"];
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;

const BASELINE_LEFT_PANEL_PATHS = [
    "/cases/case-list.html",
    "/cases/new-case.html",
    "/cases/edit-case.html",
    "/cases/plaint.html",
    "/cases/plaint-create.html",
    "/cases/edit-plaint.html",
    "/cases/answer.html",
    "/cases/answer-create.html",
    "/cases/edit-answer.html",
    "/cases/witness-list.html",
    "/cases/witness-create.html",
    "/cases/edit-witness.html",
    "/cases/judgment-list.html",
    "/cases/judgment-create.html",
    "/cases/edit-judgment.html",
    "/cases/finished.html",
    "/dashboard.html",
    "/calendar.html",
    "/customers/client-list.html",
    "/customers/Add-Client.html",
    "/invoices/Payments-list.html",
    "/expenses/expense-list.html",
    "/finance/finance.html",
    "/support/lawyer-list.html",
    "/support/court-list.html",
    "/support/support.html",
    "/support/add-lawyer.html",
    "/support/add-court.html",
    "/users/user-list.html",
    "/users/profile-list.html",
    "/users/profile-view.html",
    "/users/add-profile.html",
    "/users/user-access.html",
    "/users/user-logged.html",
    "/support/email-setup.html"
];
const USER_DEFAULT_ALLOWED_PATHS = [
    "/login.html",
    ...BASELINE_LEFT_PANEL_PATHS
];
let USER_ALLOWED_PATHS_RUNTIME = [...USER_DEFAULT_ALLOWED_PATHS];
const USER_ALLOWED_CACHE_KEY = "userAllowedPathsRuntime";
let USER_ALLOWED_ACTIONS_RUNTIME = [];
const USER_ALLOWED_ACTIONS_CACHE_KEY = "userAllowedActionsRuntime";
let USER_ACCESS_CONFIG_APPLIES_RUNTIME = false;
const USER_ACCESS_CONFIG_ENABLED_CACHE_KEY = "userAccessConfigEnabledRuntime";
const MAPPED_COMPANY_NAME_KEY = "mappedCompanyName";
const MAPPED_COMPANY_LOGO_URL_KEY = "mappedCompanyLogoUrl";
const MAPPED_COMPANY_CODE_KEY = "mappedCompanyCode";
const MAPPED_COMPANY_EMAIL_KEY = "mappedCompanyEmail";

function ensureCoreAllowedPaths(paths){
    const normalized = Array.isArray(paths)
        ? paths.map((x) => String(x || "").trim().toLowerCase()).filter(Boolean)
        : [];
    const merged = new Set([
        "/login.html",
        ...BASELINE_LEFT_PANEL_PATHS,
        ...normalized
    ]);
    return Array.from(merged);
}
window.__userAccessPermissionsLoaded = false;
window.__waitForUserAccessPermissions = function __waitForUserAccessPermissions(){
    if(window.__userAccessPermissionsLoaded){
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        const done = () => resolve();
        document.addEventListener("app:user-access-ready", done, { once: true });
        window.setTimeout(done, 1500);
    });
};

const MANAGER_BLOCKED_PATHS = [
    "/users/add-user.html",
    "/users/user-list.html",
    "/users/preference.html",
    "/add-user.html",
    "/user-list.html",
    "/preference.html"
];

function buildPagesPath(fileName){
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx !== -1){
        return path.slice(0, idx + 7) + fileName;
    }
    return `/${fileName}`;
}

function enforceAuthentication(){
    const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
    const isLoginPage = path.endsWith("/login.html") || path.endsWith("login.html");
    const token = localStorage.getItem("token");

    if(!token && !isLoginPage){
        window.location.replace(buildPagesPath("login.html"));
        return false;
    }

    if(token && isLoginPage){
        window.location.replace(buildPagesPath("dashboard.html"));
        return false;
    }

    return true;
}

function markUserActivity(){
    try{
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }catch(_err){
    }
}

function setupActivityTracking(){
    if(window.__activityTrackingBound) return;
    window.__activityTrackingBound = true;
    ACTIVITY_EVENTS.forEach((eventName) => {
        window.addEventListener(eventName, markUserActivity, { passive: true });
    });
    markUserActivity();
}

function isLoginPagePath(){
    const path = window.location.pathname.replace(/\\/g, "/").toLowerCase();
    return path.endsWith("/login.html") || path.endsWith("login.html");
}

function logoutForInactivity(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userId");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("selectedDatabaseName");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(USER_ALLOWED_CACHE_KEY);
    localStorage.removeItem(USER_ALLOWED_ACTIONS_CACHE_KEY);
    localStorage.removeItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY);
    localStorage.removeItem(MAPPED_COMPANY_NAME_KEY);
    localStorage.removeItem(MAPPED_COMPANY_LOGO_URL_KEY);
    localStorage.removeItem(MAPPED_COMPANY_CODE_KEY);
    localStorage.removeItem(MAPPED_COMPANY_EMAIL_KEY);
    localStorage.removeItem("userProfileName");
    localStorage.removeItem("userProfilePictureUrl");
    window.location.replace(buildPagesPath("login.html"));
}

function enforceIdleTimeout(){
    const token = localStorage.getItem("token");
    if(!token || isLoginPagePath()) return true;
    const lastActivityAt = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if(!Number.isFinite(lastActivityAt) || lastActivityAt <= 0){
        markUserActivity();
        return true;
    }
    if(Date.now() - lastActivityAt > IDLE_TIMEOUT_MS){
        logoutForInactivity();
        return false;
    }
    return true;
}

function startIdleTimeoutWatcher(){
    if(window.__idleTimeoutWatcherStarted) return;
    window.__idleTimeoutWatcherStarted = true;
    window.setInterval(() => {
        enforceIdleTimeout();
    }, IDLE_CHECK_INTERVAL_MS);
}

function hasAccessConfigRestrictions(){
    if(USER_ACCESS_CONFIG_APPLIES_RUNTIME === true){
        return true;
    }
    if(USER_ACCESS_CONFIG_APPLIES_RUNTIME === false){
        return false;
    }
    return String(localStorage.getItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY) || "") === "1";
}
window.hasAccessConfigRestrictions = hasAccessConfigRestrictions;

function getAccessConfigState(){
    if(USER_ACCESS_CONFIG_APPLIES_RUNTIME === true || USER_ACCESS_CONFIG_APPLIES_RUNTIME === false){
        return USER_ACCESS_CONFIG_APPLIES_RUNTIME;
    }
    const cached = String(localStorage.getItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY) || "");
    if(cached === "1") return true;
    if(cached === "0") return false;
    return null;
}

function enforceUserAccess(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "user" && role !== "manager") return;
    const selectedDb = String(localStorage.getItem("selectedDatabaseName") || "").trim().toLowerCase();
    if(role === "user" && selectedDb === "demo"){
        return;
    }
    const path = window.location.pathname.replace(/\\/g,"/");
    const allowed = USER_ALLOWED_PATHS_RUNTIME.some(suffix => path.endsWith(suffix));
    if(allowed) return;
    const idx = path.lastIndexOf("/pages/");
    if(idx !== -1){
        window.location.href = path.slice(0, idx + 7) + "dashboard.html";
        return;
    }
    window.location.href = "/dashboard.html";
}

function enforceManagerAccess(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "manager") return;
    const path = window.location.pathname.replace(/\\/g,"/");
    const blocked = MANAGER_BLOCKED_PATHS.some(suffix => path.endsWith(suffix));
    if(!blocked) return;
    const idx = path.lastIndexOf("/pages/");
    if(idx !== -1){
        window.location.href = path.slice(0, idx + 7) + "dashboard.html";
        return;
    }
    window.location.href = "/dashboard.html";
}

function applyUserNavRestrictions(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const enforceByConfiguredRole = role === "manager" && getAccessConfigState() === true;
    if(role !== "user" && !enforceByConfiguredRole) return;
    const allowed = USER_ALLOWED_PATHS_RUNTIME;
    document.querySelectorAll(".sidebar a").forEach(a=>{
        const href = (a.getAttribute("href") || "").trim();
        if(!href || href.startsWith("#") || href.toLowerCase().includes("logout")) return;
        let normalized = href.replace(/\\/g,"/");
        if(!normalized.startsWith("/")) normalized = "/" + normalized;
        const isAllowed = allowed.some(suffix => normalized.endsWith(suffix));
        const financeAliasAllowed = normalized.endsWith("/finance.html") && hasUserGrantedPath("/finance/finance.html");
        const allowThisLink = isAllowed || financeAliasAllowed;
        if(!allowThisLink){
            const li = a.closest("li");
            if(li){
                li.style.display = "none";
            }else{
                a.style.display = "none";
            }
        }
    });

}

function applyManagerNavRestrictions(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "manager") return;
    document.querySelectorAll(".sidebar a").forEach(a=>{
        const href = (a.getAttribute("href") || "").trim();
        if(!href || href.startsWith("#") || href.toLowerCase().includes("logout")) return;
        let normalized = href.replace(/\\/g,"/");
        if(!normalized.startsWith("/")) normalized = "/" + normalized;
        const isBlocked = MANAGER_BLOCKED_PATHS.some(suffix => normalized.endsWith(suffix));
        if(isBlocked){
            const li = a.closest("li");
            if(li){
                li.style.display = "none";
            }else{
                a.style.display = "none";
            }
        }
    });
}

function getUsersLink(fileName){
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx === -1) return `/users/${fileName}`;
    const rest = path.slice(idx + 7);
    const depth = Math.max(0, rest.split("/").length - 1);
    const prefix = depth === 0 ? "" : "../".repeat(depth);
    return `${prefix}users/${fileName}`;
}

function getFinanceLink(fileName){
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx === -1) return `/finance/${fileName}`;
    const rest = path.slice(idx + 7);
    const depth = Math.max(0, rest.split("/").length - 1);
    const prefix = depth === 0 ? "" : "../".repeat(depth);
    return `${prefix}finance/${fileName}`;
}

function getSupportLink(fileName){
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx === -1) return `/support/${fileName}`;
    const rest = path.slice(idx + 7);
    const depth = Math.max(0, rest.split("/").length - 1);
    const prefix = depth === 0 ? "" : "../".repeat(depth);
    return `${prefix}support/${fileName}`;
}

function toMenuHref(canonicalPath){
    const clean = String(canonicalPath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if(!clean) return "#";
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx === -1){
        return `/${clean}`;
    }
    const rest = path.slice(idx + 7);
    const depth = Math.max(0, rest.split("/").length - 1);
    const prefix = depth === 0 ? "" : "../".repeat(depth);
    return `${prefix}${clean}`;
}

function normalizeAccessPath(value){
    let raw = String(value || "").trim().replace(/\\/g, "/");
    if(!raw) return "";
    if(/^https?:\/\//i.test(raw)){
        try{
            raw = new URL(raw).pathname || "";
        }catch(_err){
        }
    }
    const pagesIdx = raw.toLowerCase().indexOf("/pages/");
    if(pagesIdx !== -1){
        raw = raw.slice(pagesIdx + 6);
    }
    if(!raw.startsWith("/")){
        raw = `/${raw}`;
    }
    return raw.toLowerCase();
}

function getPagesRelativePrefix(){
    const path = window.location.pathname.replace(/\\/g, "/");
    const idx = path.lastIndexOf("/pages/");
    if(idx === -1){
        return "";
    }
    const rest = path.slice(idx + 7);
    const depth = Math.max(0, rest.split("/").length - 1);
    if(depth === 0){
        return "../";
    }
    return "../".repeat(depth + 1);
}

function ensureSidebarScaffold(){
    if(document.querySelector(".sidebar")){
        return;
    }
    const container = document.getElementById("sidebar-container");
    if(!container){
        return;
    }
    const prefix = getPagesRelativePrefix();
    const logoPath = `${prefix}assets/images/logo.png`;
    container.innerHTML = `
        <div class="sidebar">
            <div class="logo">
                <img src="${logoPath}" alt="Logo">
                <span>AXIS_CMS_WEB</span>
            </div>
            <ul class="nav-links" style="visibility:hidden;"></ul>
        </div>
    `;
}

function isCustomersRestrictedSidebarPage(){
    return false;
}

function isCasesRestrictedSidebarPage(){
    return false;
}

function renderSidebarMenuByAccess(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "admin" && role !== "manager" && role !== "user") return;
    const isCustomersRestrictedPage = isCustomersRestrictedSidebarPage();
    const isCasesRestrictedPage = isCasesRestrictedSidebarPage();
    const menuEntries = isCasesRestrictedPage ? [
        { path: "/dashboard.html", label: "Dashboard" },
        { path: "/cases/case-list.html", label: "Cases" },
        { path: "/cases/plaint.html", label: "Plaint" },
        { path: "/cases/answer.html", label: "Answer" },
        { path: "/cases/witness-list.html", label: "List of witnesses" },
        { path: "/cases/judgment-list.html", label: "Dudgement" }
    ] : isCustomersRestrictedPage ? [
        { path: "/dashboard.html", label: "Dashboard" },
        { path: "/customers/client-list.html", label: "Client" },
        { path: "/customers/Add-Client.html", label: "Add Client" }
    ] : [
        { path: "/dashboard.html", label: "Dashboard" },
        { path: "/calendar.html", label: "Calender" },
        { path: "/customers/client-list.html", label: "Client" },
        { path: "/customers/Add-Client.html", label: "Add Client" },
        { path: "/cases/case-list.html", label: "Cases" },
        { path: "/cases/plaint.html", label: "Plaint" },
        { path: "/cases/answer.html", label: "Answer" },
        { path: "/cases/witness-list.html", label: "List of witnesses" },
        { path: "/cases/judgment-list.html", label: "Dudgement" },
        { path: "/cases/finished.html", label: "Finished" },
        { path: "/invoices/Payments-list.html", label: "Invoices" },
        { path: "/invoices/create-invoice.html", label: "Create Invoice" },
        { path: "/expenses/expense-list.html", label: "Expenses" },
        { path: "/expenses/add-expense.html", label: "Add Expense" },
        { path: "/finance/finance.html", label: "Finance" },
        { path: "/support/lawyer-list.html", label: "Lawyer List" },
        { path: "/support/court-list.html", label: "Court List" },
        { path: "/users/user-list.html", label: "Users" },
        { path: "/users/preference.html", label: "Preference" },
        { path: "/users/profile-list.html", label: "Profile" },
        { path: "/users/user-access.html", label: "Access" },
        { path: "/users/user-logged.html", label: "Logged" },
        { path: "/support/email-setup.html", label: "Email" }
    ];
    const shouldEnforceAllowedPages =
        !isCustomersRestrictedPage && !isCasesRestrictedPage && (
        role === "user" ||
        (role === "manager" && getAccessConfigState() === true)
        );
    const granted = menuEntries.filter((entry) => hasUserGrantedPath(entry.path));
    const finalMenu = shouldEnforceAllowedPages
        ? (granted.length ? granted : [{ path: "/dashboard.html", label: "Dashboard" }])
        : menuEntries;
    const signature = finalMenu.map((entry) => String(entry.path || "").trim().toLowerCase()).join("|");
    if(window.__lastAccessMenuSignature === signature){
        return;
    }
    window.__lastAccessMenuSignature = signature;

    const groups = [
        { path: "/dashboard.html", label: "Dashboard" },
        { path: "/calendar.html", label: "Calender" },
        {
            path: "/customers/client-list.html",
            label: "Client"
        },
        {
            path: "/cases/case-list.html",
            label: "Cases",
            children: [
                { path: "/cases/case-list.html", label: "Cases List" },
                { path: "/cases/plaint.html", label: "Plaint" },
                { path: "/cases/answer.html", label: "Answer" },
                { path: "/cases/witness-list.html", label: "List of witnesses" },
                { path: "/cases/judgment-list.html", label: "Dudgement" }
            ]
        },
        { path: "/cases/finished.html", label: "Finished" },
        {
            path: "/invoices/Payments-list.html",
            label: "Payments",
            children: [
                { path: "/invoices/Payments-list.html", label: "Payments List" },
                { path: "/invoices/create-invoice.html", label: "Create Invoice" }
            ]
        },
        {
            path: "/expenses/expense-list.html",
            label: "Expenses",
            children: [{ path: "/expenses/add-expense.html", label: "Add Expense" }]
        },
        { path: "/finance/finance.html", label: "Finance" },
        {
            path: "/support/lawyer-list.html",
            label: "Support",
            children: [
                { path: "/support/lawyer-list.html", label: "Lawyer List" },
                { path: "/support/court-list.html", label: "Court List" },
            ]
        },
        {
            path: "/users/user-list.html",
            label: "Users",
            children: [
                { path: "/users/user-list.html", label: "User List" },
                { path: "/users/profile-list.html", label: "Profile" },
                { path: "/users/preference.html", label: "Preference" },
                { path: "/users/user-access.html", label: "Access" },
                { path: "/users/user-logged.html", label: "Logged" },
                { path: "/support/email-setup.html", label: "Email" }
            ]
        }
    ];

    const allowedSet = new Set(finalMenu.map((entry) => normalizeAccessPath(entry.path)));
    const normalizedPath = normalizeAccessPath(window.location.pathname || "");
    const filterGroups = (items) => (Array.isArray(items) ? items : [])
        .map((item) => {
            const children = filterGroups(item.children || []);
            const normalized = normalizeAccessPath(item.path);
            const includeSelf = allowedSet.has(normalized);
            if (!includeSelf && !children.length) return null;
            return { ...item, children };
        })
        .filter(Boolean);
    const finalGroups = filterGroups(groups);

    const makeGroupHtml = (group) => {
        const children = Array.isArray(group.children) ? group.children : [];
        if (!children.length) {
            return `<li><a href="${toMenuHref(group.path)}">${group.label}</a></li>`;
        }
        const childContainsCurrent = children.some((c) => normalizedPath.endsWith(normalizeAccessPath(c.path)));
        const selfActive = normalizedPath.endsWith(normalizeAccessPath(group.path));
        const openClass = (childContainsCurrent || selfActive) ? " open" : "";
        return `
            <li class="nav-group${openClass}">
                <button type="button" class="nav-group-toggle" data-group-toggle="1" aria-expanded="${openClass ? "true" : "false"}">
                    <span>${group.label}</span>
                    <span class="nav-group-caret">?</span>
                </button>
                <ul class="nav-submenu">
                    ${children.map((c) => `<li><a href="${toMenuHref(c.path)}">${c.label}</a></li>`).join("")}
                </ul>
            </li>
        `;
    };

    window.__accessMenuRenderLock = true;
    document.querySelectorAll(".sidebar .nav-links, .sidebar ul").forEach((nav) => {
        nav.innerHTML = finalGroups.map(makeGroupHtml).join("");
        nav.querySelectorAll("[data-group-toggle='1']").forEach((btn) => {
            btn.addEventListener("click", () => {
                const li = btn.closest(".nav-group");
                if (!li) return;
                const isOpen = li.classList.toggle("open");
                btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
            });
        });
    });
    window.__accessMenuRenderLock = false;
}

function setSidebarReadyState(isReady){
    document.querySelectorAll(".sidebar .nav-links, .sidebar ul").forEach((nav) => {
        nav.style.visibility = isReady ? "visible" : "hidden";
    });
}

function setupSidebarAccessObserver(){
                                                                           
                                                                          
}

function applyFinanceNav(){
                                                                                                 
}

function applySupportNav(){
                                                                                                 
}

function applyAdminUsersNav(){
                                                                                                 
}

function applyStockNav(){
                                                                                                 
}

function applyAccessGuards(){
    renderSidebarMenuByAccess();
    enforceUserAccess();
    enforceManagerAccess();
    applyUserNavRestrictions();
    applyManagerNavRestrictions();
}

function ensureGlobalFooter(){
    if(document.getElementById("app-global-footer")) return;
    if(document.querySelector(".sidebar")){
        document.body.classList.add("app-has-sidebar-footer");
    }
    const footer = document.createElement("footer");
    footer.id = "app-global-footer";
    footer.className = "app-global-footer";
    footer.textContent = GLOBAL_FOOTER_TEXT;
    document.body.appendChild(footer);
}

function ensureMobileSidebar(){
    const sidebar = document.querySelector(".sidebar");
    if(!sidebar) return;
    if(document.getElementById("mobileNavToggle")) return;

    const toggle = document.createElement("button");
    toggle.id = "mobileNavToggle";
    toggle.className = "mobile-nav-toggle";
    toggle.setAttribute("type", "button");
    toggle.setAttribute("aria-label", "Toggle navigation");
    toggle.innerHTML = "&#9776;";

    const backdrop = document.createElement("div");
    backdrop.id = "mobileNavBackdrop";
    backdrop.className = "mobile-nav-backdrop";

    const closeNav = () => {
        document.body.classList.remove("mobile-nav-open");
        backdrop.classList.remove("show");
    };

    const openNav = () => {
        document.body.classList.add("mobile-nav-open");
        backdrop.classList.add("show");
    };

    toggle.addEventListener("click", () => {
        if(document.body.classList.contains("mobile-nav-open")){
            closeNav();
        }else{
            openNav();
        }
    });

    backdrop.addEventListener("click", closeNav);

    window.addEventListener("resize", () => {
        if(window.innerWidth > 980){
            closeNav();
        }
    });

    document.body.appendChild(toggle);
    document.body.appendChild(backdrop);
}

function normalizeHexColor(value, fallback){
    const raw = String(value || "").trim();
    const six = /^#([0-9a-fA-F]{6})$/;
    const three = /^#([0-9a-fA-F]{3})$/;
    if(six.test(raw)) return raw.toLowerCase();
    if(three.test(raw)){
        const m = raw.slice(1).toLowerCase();
        return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
    }
    return fallback;
}

function darkenHex(hex, amount){
    const normalized = normalizeHexColor(hex, "#0f6abf");
    const r = Math.max(0, Math.min(255, parseInt(normalized.slice(1,3), 16) - amount));
    const g = Math.max(0, Math.min(255, parseInt(normalized.slice(3,5), 16) - amount));
    const b = Math.max(0, Math.min(255, parseInt(normalized.slice(5,7), 16) - amount));
    const toHex = (n) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyUiSettingsToPage(settings){
    if(!settings) return;
    if(settings.primary_color){
        const primary = normalizeHexColor(settings.primary_color, "#0f6abf");
        document.documentElement.style.setProperty("--primary", primary);
        document.documentElement.style.setProperty("--primary-2", darkenHex(primary, 25));
        document.documentElement.style.setProperty("--sidebar-deep", darkenHex(primary, 45));
    }
    if(settings.accent_color){
        document.documentElement.style.setProperty("--accent", String(settings.accent_color));
    }
    if(settings.background_color){
        const bg = normalizeHexColor(settings.background_color, "#edf3fb");
        document.documentElement.style.setProperty("--page-bg", bg);
        document.documentElement.style.setProperty("--page-bg-soft", darkenHex(bg, -12));
    }
    if(settings.button_color){
        const btn = normalizeHexColor(settings.button_color, "#0f6abf");
        document.documentElement.style.setProperty("--button-color", btn);
        document.documentElement.style.setProperty("--button-color-2", darkenHex(btn, 22));
    }
    if(settings.mode_theme){
        const mode = String(settings.mode_theme || "").trim().toLowerCase();
        document.body.classList.remove("theme-dark", "theme-light");
        document.body.classList.add(mode === "dark" ? "theme-dark" : "theme-light");
    }
    if(settings.app_name){
        const appName = String(settings.app_name);
        const normalizedAppName = normalizeAppName(appName);
        document.querySelectorAll(".sidebar .logo span").forEach((el) => {
            el.textContent = normalizedAppName;
        });
        if(document.title && !document.title.toLowerCase().includes(normalizedAppName.toLowerCase())){
            document.title = `${document.title} | ${normalizedAppName}`;
        }
    }
    if(settings.logo_url){
        const logoPath = String(settings.logo_url || "").trim();
        const logoVersion = settings.logo_updated_at ? `?v=${encodeURIComponent(String(settings.logo_updated_at))}` : "";
        const resolved = resolveLogoUrl(logoPath, logoVersion);
        setSidebarLogos(resolved);
    }
    const mappedCompanyName = String(localStorage.getItem(MAPPED_COMPANY_NAME_KEY) || "").trim();
    if(mappedCompanyName){
        document.querySelectorAll(".sidebar .logo span").forEach((el) => {
            el.textContent = mappedCompanyName;
        });
    }
    const mappedLogoPath = String(localStorage.getItem(MAPPED_COMPANY_LOGO_URL_KEY) || "").trim();
    if(mappedLogoPath){
        setSidebarLogos(resolveLogoUrl(mappedLogoPath));
    }
    if(settings.footer_text){
        const footer = document.getElementById("app-global-footer");
        if(footer){
                                                           
            footer.textContent = GLOBAL_FOOTER_TEXT;
        }
    }
}
window.applyUiSettingsToPage = applyUiSettingsToPage;

function resolveLogoUrl(rawPath, querySuffix = ""){
    const source = String(rawPath || "").trim();
    if(!source) return "";
    const apiOrigin = BASE_URL.replace(/\/api$/,"").replace(/\/+$/, "");
    const cleaned = source
        .replace(/\\/g, "/")
        .replace(/^(\.\.\/|\.\/)+/g, "")
        .replace(/^backend\//i, "");
    const absolute = /^data:image\//i.test(cleaned)
        ? cleaned
        : (/^https?:\/\//i.test(cleaned)
            ? cleaned
            : `${apiOrigin}${cleaned.startsWith("/") ? "" : "/"}${cleaned}`);
    const suffix = String(querySuffix || "").trim();
    if(!suffix) return absolute;
    if(/^data:image\//i.test(absolute)) return absolute;
    return `${absolute}${suffix}`;
}

function setSidebarLogos(absoluteLogoUrl){
    const target = String(absoluteLogoUrl || "").trim();
    if(!target) return;
    document.querySelectorAll(".sidebar .logo img").forEach((img) => {
        const fallbackLogo = img.getAttribute("data-fallback-logo") || img.getAttribute("src") || "";
        if(fallbackLogo){
            img.setAttribute("data-fallback-logo", fallbackLogo);
        }
        img.onerror = () => {
            const safeFallback = String(img.getAttribute("data-fallback-logo") || "").trim();
            if(safeFallback && img.src !== safeFallback){
                img.src = safeFallback;
            }
        };
        img.src = target;
    });
}

function cacheUserUiSettings(settings){
    if(!settings || typeof settings !== "object") return;
    try{
        const payload = {
            primary_color: settings.primary_color,
            background_color: settings.background_color,
            button_color: settings.button_color,
            mode_theme: settings.mode_theme
        };
        localStorage.setItem(USER_UI_SETTINGS_CACHE_KEY, JSON.stringify(payload));
    }catch(_err){
    }
}
window.cacheUserUiSettings = cacheUserUiSettings;

(function applyCachedThemeImmediately(){
    const apply = (settings) => {
        if(!settings || typeof settings !== "object") return;
        if(document.body){
            applyUiSettingsToPage(settings);
            return;
        }
        document.addEventListener("DOMContentLoaded", () => applyUiSettingsToPage(settings), { once: true });
    };
    try{
        const personalRaw = localStorage.getItem(USER_UI_SETTINGS_CACHE_KEY);
        if(personalRaw){
            const parsedPersonal = JSON.parse(personalRaw);
            if(parsedPersonal && typeof parsedPersonal === "object"){
                apply(parsedPersonal);
                return;
            }
        }
    }catch(_err){
    }
    try{
        const publicRaw = localStorage.getItem(UI_SETTINGS_CACHE_KEY);
        if(publicRaw){
            const parsedPublic = JSON.parse(publicRaw);
            if(parsedPublic && typeof parsedPublic === "object"){
                apply(parsedPublic);
            }
        }
    }catch(_err){
    }
})();

function applyMappedBranding(){
    const mappedCompanyName = String(localStorage.getItem(MAPPED_COMPANY_NAME_KEY) || "").trim();
    if(mappedCompanyName){
        const normalizedMappedCompanyName = normalizeAppName(mappedCompanyName);
        document.querySelectorAll(".sidebar .logo span").forEach((el) => {
            el.textContent = normalizedMappedCompanyName;
        });
    }
    const mappedLogoPath = String(localStorage.getItem(MAPPED_COMPANY_LOGO_URL_KEY) || "").trim();
    if(mappedLogoPath){
        setSidebarLogos(resolveLogoUrl(mappedLogoPath));
    }
}

function normalizeAppName(appName){
    const compact = String(appName || "").trim().toLowerCase().replace(/[_\s]+/g, " ");
    if(
        compact.includes("axis cms web") ||
        compact.includes("axis_cms_web") ||
        compact.includes("axis cms system") ||
        compact.includes("inhouse") ||
        compact.includes("axis cms system")
    ){
        return "AXIS_CMS_WEB";
    }
    return String(appName).replace(/_/g, " ").toUpperCase();
}

async function loadPublicUiSettings(){
    const disableUiSettingsRefresh = typeof window !== "undefined" && window.__DISABLE_PUBLIC_UI_REFRESH__ === true;
    if(disableUiSettingsRefresh){
        return;
    }

    if(ENABLE_PUBLIC_UI_SETTINGS_RUNTIME){
        try{
            const cached = localStorage.getItem(UI_SETTINGS_CACHE_KEY);
            if(cached){
                const parsed = JSON.parse(cached);
                if(parsed && typeof parsed === "object"){
                    applyUiSettingsToPage(parsed);
                    applyMappedBranding();
                }
            }
        }catch(_cacheErr){
        }

        try{
            const res = await fetch(`${BASE_URL}/ui-settings/public`);
            if(res.ok){
                const data = await res.json();
                try{
                    localStorage.setItem(UI_SETTINGS_CACHE_KEY, JSON.stringify(data || {}));
                }catch(_cacheWriteErr){
                }
                applyUiSettingsToPage(data);
                applyMappedBranding();
            }
        }catch(_err){
        }
    }

    const token = localStorage.getItem("token");
    if(!token) return;
    try{
        const personal = await request("/preferences/my-ui-settings", "GET");
        if(personal && typeof personal === "object"){
            applyUiSettingsToPage(personal);
            applyMappedBranding();
            cacheUserUiSettings(personal);
        }
    }catch(_err){
    }
}

async function loadUserAccessPermissions(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "user" && role !== "admin" && role !== "manager"){
        USER_ALLOWED_PATHS_RUNTIME = [...USER_DEFAULT_ALLOWED_PATHS];
        USER_ALLOWED_ACTIONS_RUNTIME = [];
        USER_ACCESS_CONFIG_APPLIES_RUNTIME = false;
        localStorage.removeItem(USER_ALLOWED_CACHE_KEY);
        localStorage.removeItem(USER_ALLOWED_ACTIONS_CACHE_KEY);
        localStorage.removeItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY);
        return;
    }
    if(role === "user"){
        const cachedRaw = localStorage.getItem(USER_ALLOWED_CACHE_KEY);
        if(cachedRaw){
            try{
                const cached = JSON.parse(cachedRaw);
                if(Array.isArray(cached) && cached.length){
                    USER_ALLOWED_PATHS_RUNTIME = ensureCoreAllowedPaths(cached);
                }
            }catch(_e){}
        }
        const cachedActionsRaw = localStorage.getItem(USER_ALLOWED_ACTIONS_CACHE_KEY);
        if(cachedActionsRaw){
            try{
                const cached = JSON.parse(cachedActionsRaw);
                if(Array.isArray(cached) && cached.length){
                    USER_ALLOWED_ACTIONS_RUNTIME = Array.from(new Set(cached.map((x)=>String(x || "").trim().toLowerCase()).filter(Boolean)));
                }
            }catch(_e){}
        }
    }else{
        USER_ALLOWED_PATHS_RUNTIME = [...USER_DEFAULT_ALLOWED_PATHS];
        USER_ALLOWED_ACTIONS_RUNTIME = [];
    }
    const cachedConfigState = String(localStorage.getItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY) || "");
    const previousConfigState = cachedConfigState === "1"
        ? true
        : (cachedConfigState === "0" ? false : null);
    if(cachedConfigState === "1"){
        USER_ACCESS_CONFIG_APPLIES_RUNTIME = true;
    }else if(cachedConfigState === "0"){
        USER_ACCESS_CONFIG_APPLIES_RUNTIME = false;
    }else{
        USER_ACCESS_CONFIG_APPLIES_RUNTIME = null;
    }
    const token = localStorage.getItem("token");
    if(!token){
        return;
    }
    try{
        const res = await fetch(`${BASE_URL}/users/access/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if(!res.ok){
            localStorage.removeItem(MAPPED_COMPANY_NAME_KEY);
            localStorage.removeItem(MAPPED_COMPANY_CODE_KEY);
            localStorage.removeItem(MAPPED_COMPANY_EMAIL_KEY);
            localStorage.removeItem(MAPPED_COMPANY_LOGO_URL_KEY);
            return;
        }
        const data = await res.json();
        const dynamicAllowedPages = Array.isArray(data.allowed_pages) ? data.allowed_pages : [];
        const normalizedAllowedPages = dynamicAllowedPages
            .map((x) => String(x || "").trim().toLowerCase())
            .filter(Boolean);
        const dynamicActions = Array.isArray(data.allowed_actions) ? data.allowed_actions : [];
        const normalizedActionKeys = dynamicActions
            .map((x) => String(x || "").trim().toLowerCase())
            .filter((x) => x.includes("::"));
        const pagesFromActions = normalizedActionKeys
            .map((x) => x.slice(0, x.lastIndexOf("::")))
            .filter(Boolean);
        const hasLegacySupportPage = normalizedAllowedPages.includes("/support/support.html")
            || pagesFromActions.includes("/support/support.html");
        const hasLegacySupportAddAction = normalizedActionKeys.includes("/support/support.html::add");
        const dynamicPages = Array.from(new Set([
            ...normalizedAllowedPages,
            ...pagesFromActions,
            ...(hasLegacySupportPage ? ["/support/lawyer-list.html", "/support/court-list.html"] : []),
            ...(hasLegacySupportAddAction ? ["/support/add-lawyer.html", "/support/add-court.html"] : []),
            ...(normalizedActionKeys.includes("/users/technician-list.html::add") ? ["/users/add-technician.html"] : []),
            ...(normalizedActionKeys.includes("/users/technician-list.html::edit") ? ["/users/edit-technician.html"] : [])
        ]));
        if(typeof data?.has_access_config === "boolean"){
            let nextConfigState = data.has_access_config;
                                                                                                     
                                                                                                     
            if((role === "admin" || role === "manager") && previousConfigState === true && nextConfigState === false){
                nextConfigState = true;
            }
            USER_ACCESS_CONFIG_APPLIES_RUNTIME = nextConfigState;
            localStorage.setItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY, nextConfigState ? "1" : "0");
        }else if(role === "admin" || role === "manager"){
            if(dynamicPages.length > 0 || dynamicActions.length > 0){
                USER_ACCESS_CONFIG_APPLIES_RUNTIME = true;
                localStorage.setItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY, "1");
            }
        }
        const merged = new Set([
            "/login.html",
            ...BASELINE_LEFT_PANEL_PATHS,
            ...dynamicPages
        ]);
        USER_ALLOWED_PATHS_RUNTIME = ensureCoreAllowedPaths(Array.from(merged));
        USER_ALLOWED_ACTIONS_RUNTIME = Array.from(new Set(normalizedActionKeys));
        localStorage.setItem(USER_ALLOWED_CACHE_KEY, JSON.stringify(USER_ALLOWED_PATHS_RUNTIME));
        localStorage.setItem(USER_ALLOWED_ACTIONS_CACHE_KEY, JSON.stringify(USER_ALLOWED_ACTIONS_RUNTIME));
        if(data.database_name){
            localStorage.setItem("selectedDatabaseName", String(data.database_name));
        }else{
                                                                                                       
        }
        if(data.mapped_company_name){
            localStorage.setItem(MAPPED_COMPANY_NAME_KEY, String(data.mapped_company_name).trim());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_NAME_KEY);
        }
        if(data.mapped_company_code){
            localStorage.setItem(MAPPED_COMPANY_CODE_KEY, String(data.mapped_company_code).trim().toUpperCase());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_CODE_KEY);
        }
        if(data.mapped_company_email){
            localStorage.setItem(MAPPED_COMPANY_EMAIL_KEY, String(data.mapped_company_email).trim().toLowerCase());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_EMAIL_KEY);
        }
        if(data.mapped_company_logo_url){
            localStorage.setItem(MAPPED_COMPANY_LOGO_URL_KEY, String(data.mapped_company_logo_url).trim());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_LOGO_URL_KEY);
        }
        applyMappedBranding();
    }catch(_err){
        localStorage.removeItem(MAPPED_COMPANY_NAME_KEY);
        localStorage.removeItem(MAPPED_COMPANY_CODE_KEY);
        localStorage.removeItem(MAPPED_COMPANY_EMAIL_KEY);
        localStorage.removeItem(MAPPED_COMPANY_LOGO_URL_KEY);
                                                     
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    setupActivityTracking();
    startIdleTimeoutWatcher();
    if(!enforceIdleTimeout()) return;
    if(!enforceAuthentication()) return;
    ensureSidebarScaffold();
    setSidebarReadyState(false);
    await loadUserAccessPermissions();
    window.__userAccessPermissionsLoaded = true;
    document.dispatchEvent(new CustomEvent("app:user-access-ready"));
    applyAccessGuards();
    setSidebarReadyState(true);
    applyMappedBranding();
    ensureMobileSidebar();
    ensureGlobalFooter();
    loadPublicUiSettings();
});

window.addEventListener("pageshow", () => {
    if(!enforceIdleTimeout()) return;
    enforceAuthentication();
    ensureSidebarScaffold();
    if(window.__userAccessPermissionsLoaded){
        applyAccessGuards();
    }else{
        document.addEventListener("app:user-access-ready", applyAccessGuards, { once: true });
    }
});

window.addEventListener("popstate", () => {
    if(!enforceIdleTimeout()) return;
    enforceAuthentication();
});

document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "visible"){
        if(!enforceIdleTimeout()) return;
        enforceAuthentication();
    }
});

function ensureMessageBoxStyles(){
    if(document.getElementById("message-box-styles")) return;
    const style = document.createElement("style");
    style.id = "message-box-styles";
    style.textContent = `
        .app-message-box {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 240px;
            max-width: 420px;
            padding: 12px 14px;
            border-radius: 8px;
            color: #fff;
            font-weight: 600;
            box-shadow: 0 10px 24px rgba(0,0,0,0.2);
            opacity: 0;
            transform: translateY(-8px);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .app-message-box.show { opacity: 1; transform: translateY(0); }
        .app-message-box.success { background: #198754; }
        .app-message-box.error { background: #dc3545; }
    `;
    document.head.appendChild(style);
}

function showMessageBox(message, type="success", duration=2200){
    ensureMessageBoxStyles();
    let box = document.getElementById("app-message-box");
    if(!box){
        box = document.createElement("div");
        box.id = "app-message-box";
        box.className = "app-message-box";
        document.body.appendChild(box);
    }
    box.textContent = message;
    box.className = `app-message-box ${type}`;
    requestAnimationFrame(()=>box.classList.add("show"));
    setTimeout(()=>box.classList.remove("show"), duration);
}
window.showMessageBox = showMessageBox;

async function request(endpoint, method="GET", data=null){
    if(!enforceIdleTimeout()){
        throw new Error("Session expired due to inactivity.");
    }
    const token = localStorage.getItem("token");
    const isAuthEndpoint = endpoint.startsWith("/auth/");
    if(!token && !isAuthEndpoint){
        enforceAuthentication();
        throw new Error("Please login first.");
    }
    const headers = {"Content-Type":"application/json"};
    if(token) headers["Authorization"] = "Bearer "+token;
    const selectedDb = String(localStorage.getItem("selectedDatabaseName") || "").trim().toLowerCase();
    if(selectedDb){
        headers["X-Database-Name"] = selectedDb;
    }

    const options = {
        method,
        headers,
    };
    if(data) options.body = JSON.stringify(data);

    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const authFallbackUrl = `${window.location.origin.replace(/\/+$/, "")}/api${path}`;
    const apiOrigin = BASE_URL.replace(/\/api$/,"");
    const isLoginRequest = method.toUpperCase() === "POST" && path === "/auth/login";
    const retryableStatuses = [502, 503, 504];
    const maxAttempts = isLoginRequest ? 2 : 1;
    const retryDelayMs = 700;

    let lastRes = null;
    let lastResult = {};
    for(let attempt = 1; attempt <= maxAttempts; attempt++){
        let res;
        try{
            res = await fetch(BASE_URL + path, options);
        }catch(_err){
            if(isLoginRequest && attempt < maxAttempts){
                await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                continue;
            }
            throw new Error(`Failed to fetch. Make sure backend server is running at ${apiOrigin}`);
        }

        const raw = await res.text();
        let result = {};
        if(raw){
            try{
                result = JSON.parse(raw);
            }catch(_err){
                result = { message: raw };
            }
        }

        if(!res.ok && isLoginRequest && retryableStatuses.includes(res.status) && attempt < maxAttempts){
            await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
            continue;
        }

        lastRes = res;
        lastResult = result;
        break;
    }

    const res = lastRes;
    const result = lastResult;
    if(!res){
        throw new Error(`Request failed for ${method} ${endpoint}`);
    }

    if(!res.ok){
        if(res.status === 404 && isAuthEndpoint){
            try{
                const retryRes = await fetch(authFallbackUrl, options);
                const retryRaw = await retryRes.text();
                let retryResult = {};
                if(retryRaw){
                    try{
                        retryResult = JSON.parse(retryRaw);
                    }catch(_err){
                        retryResult = { message: retryRaw };
                    }
                }
                if(retryRes.ok){
                    return retryResult;
                }
            }catch(_err){
            }
        }
        const isHtml = typeof result.message === "string" && /<\s*html|<!doctype/i.test(result.message);
        if(res.status === 404){
            if(result && typeof result.message === "string" && result.message.trim()){
                throw new Error(result.message.trim());
            }
            throw new Error(`Endpoint not found: ${method} ${endpoint}`);
        }
        if(res.status === 502 || res.status === 503 || res.status === 504){
            const serviceName = isAuthEndpoint ? "Login service" : "API service";
            throw new Error(`${serviceName} is temporarily unavailable (${res.status}). Please check backend process and proxy at ${apiOrigin}.`);
        }
        if(isHtml){
            throw new Error(`Server returned an unexpected HTML response (${res.status}) for ${method} ${endpoint}. Please check backend process and proxy at ${apiOrigin}.`);
        }
        throw new Error(result.message || `Request failed (${res.status})`);
    }
    return result;
}
window.request = request;

                         
                       
                            
async function login(){
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value;

    if(!email || !password || !role){
        alert("Please fill all fields!");
        return;
    }

    try{
                                                                                              
        localStorage.removeItem(USER_ALLOWED_CACHE_KEY);
        localStorage.removeItem(USER_ALLOWED_ACTIONS_CACHE_KEY);
        localStorage.removeItem(USER_ACCESS_CONFIG_ENABLED_CACHE_KEY);
        const res = await request("/auth/login","POST",{email,password});
        if(res.user.role !== role){
            alert("Selected role does not match your account role!");
            return;
        }
        localStorage.setItem("token",res.token);
        localStorage.setItem("role",res.user.role);
        localStorage.setItem("userId", res.user.id);
        localStorage.setItem("userName", res.user.username || "");
        localStorage.setItem("userEmail", res.user.email || "");
        const loginProfileName = String((res.user && res.user.user_profile_name) || "").trim();
        if(loginProfileName){
            localStorage.setItem("userProfileName", loginProfileName);
        }else{
            localStorage.removeItem("userProfileName");
        }
        if(res.user && res.user.database_name){
            localStorage.setItem("selectedDatabaseName", String(res.user.database_name).trim().toLowerCase());
        }else{
            localStorage.removeItem("selectedDatabaseName");
        }
        if(res.user && res.user.mapped_company_name){
            localStorage.setItem(MAPPED_COMPANY_NAME_KEY, String(res.user.mapped_company_name).trim());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_NAME_KEY);
        }
        if(res.user && res.user.mapped_company_code){
            localStorage.setItem(MAPPED_COMPANY_CODE_KEY, String(res.user.mapped_company_code).trim().toUpperCase());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_CODE_KEY);
        }
        if(res.user && res.user.mapped_company_email){
            localStorage.setItem(MAPPED_COMPANY_EMAIL_KEY, String(res.user.mapped_company_email).trim().toLowerCase());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_EMAIL_KEY);
        }
        if(res.user && res.user.mapped_company_logo_url){
            localStorage.setItem(MAPPED_COMPANY_LOGO_URL_KEY, String(res.user.mapped_company_logo_url).trim());
        }else{
            localStorage.removeItem(MAPPED_COMPANY_LOGO_URL_KEY);
        }
        const loginAvatar = res && res.user
            ? String(res.user.user_profile_picture_data_url || res.user.user_profile_picture_url || "").trim()
            : "";
        if(loginAvatar){
            localStorage.setItem("userProfilePictureUrl", loginAvatar);
        }else{
            localStorage.removeItem("userProfilePictureUrl");
        }
        window.location.href = "dashboard.html";
    }catch(err){
        alert(err.message);
    }
}

async function forgotPassword(){
    const emailInput = document.getElementById("email");
    const inlineEmail = String(emailInput && emailInput.value ? emailInput.value : "").trim();
    const email = inlineEmail || String(prompt("Enter your registered email for password reset") || "").trim();
    if(!email) return;

    try{
        await request("/auth/forgot-password","POST",{email});
        alert("Email matched. Password details sent to your email.");
    }catch(err){
        alert(err.message);
    }
}
function hasUserGrantedPath(path){
    const target = String(path || "").trim().toLowerCase();
    if(!target) return false;
    return USER_ALLOWED_PATHS_RUNTIME.some((x) => String(x || "").trim().toLowerCase() === target);
}
window.hasUserGrantedPath = hasUserGrantedPath;

function hasUserActionPermission(path, action){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "admin" && role !== "manager" && role !== "user"){
        return false;
    }
    if(role === "admin"){
        return true;
    }
    const selectedDb = String(localStorage.getItem("selectedDatabaseName") || "").trim().toLowerCase();
    if(role === "user" && selectedDb === "demo"){
        return true;
    }

    const actionKey = `${String(path || "").trim().toLowerCase()}::${String(action || "").trim().toLowerCase()}`;
    if(USER_ALLOWED_ACTIONS_RUNTIME.includes(actionKey)){
        return true;
    }
    // Admin/manager without explicit restrictions should not lose action buttons.
    if(role === "manager" && getAccessConfigState() !== true){
        return true;
    }
    // Fallback: if view access for the path exists, allow action-level controls for admin/manager.
    if(role === "manager" && hasUserGrantedPath(path)){
        return true;
    }
    return false;
}
window.hasUserActionPermission = hasUserActionPermission;





