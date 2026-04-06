const COMPANY_CODE_CACHE_KEY = "axisLoginCompanyCodeByUser";
const LOGIN_DEFAULT_LOGO_SRC = "../assets/images/logo.png";
let companyBrandingDebounce = null;
let companyBrandingRequestId = 0;

async function loginPageRequest(endpoint, method = "GET", data = null){
    if(typeof window.request === "function"){
        return window.request(endpoint, method, data);
    }
    const baseUrl = String(window.BASE_URL || `${window.location.origin.replace(/\/+$/, "")}/api`).replace(/\/+$/, "");
    const path = String(endpoint || "").startsWith("/") ? String(endpoint) : `/${String(endpoint || "")}`;
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("token");
    if(token){
        headers.Authorization = `Bearer ${token}`;
    }
    const options = { method, headers };
    if(data){
        options.body = JSON.stringify(data);
    }
    const res = await fetch(`${baseUrl}${path}`, options);
    const raw = await res.text();
    let result = {};
    if(raw){
        try{
            result = JSON.parse(raw);
        }catch(_err){
            result = { message: raw };
        }
    }
    if(!res.ok){
        throw new Error(result.message || `Request failed (${res.status})`);
    }
    return result;
}

function loadCompanyCodeCache(){
    try{
        const raw = localStorage.getItem(COMPANY_CODE_CACHE_KEY);
        if(!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    }catch(_err){
        return {};
    }
}

function saveCompanyCodeCache(cache){
    try{
        localStorage.setItem(COMPANY_CODE_CACHE_KEY, JSON.stringify(cache || {}));
    }catch(_err){
    }
}

function normalizeUserKey(value){
    return String(value || "").trim().toLowerCase();
}

function getRememberedCompanyCode(userInput){
    const key = normalizeUserKey(userInput);
    if(!key) return "";
    const cache = loadCompanyCodeCache();
    return String(cache[key] || "").trim().toUpperCase();
}

function rememberCompanyCode(userInput, companyCode){
    const key = normalizeUserKey(userInput);
    const code = String(companyCode || "").trim().toUpperCase();
    if(!key || !code) return;
    const cache = loadCompanyCodeCache();
    cache[key] = code;
    saveCompanyCodeCache(cache);
}

function applyRememberedCompanyCode(){
    const userInputEl = document.getElementById("email");
    const companyCodeEl = document.getElementById("companyCode");
    if(!userInputEl || !companyCodeEl) return;
    if(String(companyCodeEl.value || "").trim()){
        fetchCompanyBrandingByCode(companyCodeEl.value);
        return;
    }
    const remembered = getRememberedCompanyCode(userInputEl.value);
    if(remembered){
        companyCodeEl.value = remembered;
        fetchCompanyBrandingByCode(remembered);
    }
}

async function fetchRememberedCompanyCodeByUser(userInput){
    const key = normalizeUserKey(userInput);
    if(!key) return "";
    try{
        const res = await loginPageRequest(`/auth/company-code-memory?user=${encodeURIComponent(key)}`, "GET");
        const code = String(res?.company_code || "").trim().toUpperCase();
        if(code){
            rememberCompanyCode(userInput, code);
            return code;
        }
    }catch(_err){
    }
    return "";
}

async function applyRememberedCompanyCodeAnyDevice(){
    const userInputEl = document.getElementById("email");
    const companyCodeEl = document.getElementById("companyCode");
    if(!userInputEl || !companyCodeEl) return;
    if(String(companyCodeEl.value || "").trim()){
        fetchCompanyBrandingByCode(companyCodeEl.value);
        return;
    }
    const localCode = getRememberedCompanyCode(userInputEl.value);
    if(localCode){
        companyCodeEl.value = localCode;
        fetchCompanyBrandingByCode(localCode);
        return;
    }
    const serverCode = await fetchRememberedCompanyCodeByUser(userInputEl.value);
    if(serverCode){
        companyCodeEl.value = serverCode;
        fetchCompanyBrandingByCode(serverCode);
    }
}

function getLoginLogoElement(){
    return document.getElementById("loginCompanyLogo");
}

function setupLoginLogoFallback(){
    const el = getLoginLogoElement();
    if(!el || el.dataset.fallbackBound === "1") return;
    el.dataset.fallbackBound = "1";
    el.addEventListener("load", () => {
        el.style.display = "";
    });
    el.addEventListener("error", () => {
        el.removeAttribute("src");
        el.style.display = "none";
    });
}

function toAbsoluteLogoUrl(rawPath){
    const logoPath = String(rawPath || "").trim();
    if(!logoPath) return "";
    if(/^https?:\/\//i.test(logoPath)) return logoPath;
    const apiOrigin = String(window.BASE_URL || "").replace(/\/api\/?$/i, "");
    return `${apiOrigin}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`;
}

function applyLoginLogo(logoPath){
    const el = getLoginLogoElement();
    if(!el) return;
    setupLoginLogoFallback();
    const abs = toAbsoluteLogoUrl(logoPath);
    if(abs){
        // Keep hidden until load event confirms image is valid.
        el.style.display = "none";
        el.src = abs;
        return;
    }
    el.removeAttribute("src");
    el.style.display = "none";
}

function applyCachedLoginLogo(){
    // Login page should not show default/cached logo before company code is provided.
    applyLoginLogo("");
}

async function fetchCompanyBrandingByCode(companyCode){
    const normalized = String(companyCode || "").trim().toUpperCase();
    if(!normalized){
        applyCachedLoginLogo();
        return;
    }
    const requestId = ++companyBrandingRequestId;
    try{
        const res = await loginPageRequest(`/auth/company-branding?company_code=${encodeURIComponent(normalized)}`, "GET");
        if(requestId !== companyBrandingRequestId) return;
        const logoUrl = String(res?.logo_url || "").trim();
        if(logoUrl){
            applyLoginLogo(logoUrl);
            return;
        }
        applyLoginLogo("");
    }catch(_err){
        if(requestId !== companyBrandingRequestId) return;
        applyLoginLogo("");
    }
}

async function login(){
    const companyCodeInput = document.getElementById("companyCode");
    const emailInputEl = document.getElementById("email");
    const email = String(emailInputEl && emailInputEl.value ? emailInputEl.value : "").trim();
    let company_code = String(companyCodeInput && companyCodeInput.value ? companyCodeInput.value : "")
        .trim()
        .toUpperCase();
    const password = document.getElementById("password").value;

    if(!company_code){
        const remembered = getRememberedCompanyCode(email);
        if(remembered){
            company_code = remembered;
            if(companyCodeInput) companyCodeInput.value = remembered;
        }
    }
    if(!company_code || !email || !password){ alert("Please fill all fields"); return; }

    try{
        const res = await loginPageRequest("/auth/login","POST",{ company_code, email, password });
        localStorage.setItem("token",res.token);
        localStorage.setItem("role",res.user.role);
        if (res.user && res.user.database_name) {
            localStorage.setItem("selectedDatabaseName", String(res.user.database_name).trim().toLowerCase());
        } else {
            localStorage.removeItem("selectedDatabaseName");
        }
        localStorage.setItem("userId", res.user.id);
        localStorage.setItem("userEmail", res.user.email || email);
        if (res.user.username) {
            localStorage.setItem("userName", res.user.username);
        } else {
            localStorage.removeItem("userName");
        }
        if (res.user && res.user.mapped_company_name) {
            localStorage.setItem("mappedCompanyName", String(res.user.mapped_company_name).trim());
        } else {
            localStorage.removeItem("mappedCompanyName");
        }
        if (res.user && res.user.mapped_company_code) {
            const mappedCode = String(res.user.mapped_company_code).trim().toUpperCase();
            localStorage.setItem("mappedCompanyCode", mappedCode);
            rememberCompanyCode(email, mappedCode);
            if(res.user && res.user.username){
                rememberCompanyCode(String(res.user.username), mappedCode);
            }
            if(res.user && res.user.email){
                rememberCompanyCode(String(res.user.email), mappedCode);
            }
        } else {
            localStorage.removeItem("mappedCompanyCode");
            rememberCompanyCode(email, company_code);
        }
        if (res.user && res.user.mapped_company_email) {
            localStorage.setItem("mappedCompanyEmail", String(res.user.mapped_company_email).trim().toLowerCase());
        } else {
            localStorage.removeItem("mappedCompanyEmail");
        }
        if (res.user && res.user.mapped_company_logo_url) {
            localStorage.setItem("mappedCompanyLogoUrl", String(res.user.mapped_company_logo_url).trim());
        } else {
            localStorage.removeItem("mappedCompanyLogoUrl");
        }
        if (res.user && res.user.user_profile_picture_url) {
            localStorage.setItem("userProfilePictureUrl", String(res.user.user_profile_picture_url).trim());
        } else {
            localStorage.removeItem("userProfilePictureUrl");
        }
        window.location.href = "dashboard.html";
    }catch(err){
        alert(err.message || "Login failed");
    }
}

async function forgotPassword(){
    const emailInput = document.getElementById("email");
    const email = String(emailInput && emailInput.value ? emailInput.value : "").trim();
    if(!email){
        alert("Enter your email address first.");
        if(emailInput) emailInput.focus();
        return;
    }
    try{
        await loginPageRequest("/auth/forgot-password","POST",{email});
        alert("Email matched. Password details sent to your email.");
    }catch(err){
        alert(err.message || "Failed to send email");
    }
}

function togglePassword(){
    const input = document.getElementById("password");
    const toggleBtn = document.getElementById("passwordToggle");
    const eyeIcon = document.getElementById("eyeIcon");
    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";
    toggleBtn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    toggleBtn.setAttribute("aria-pressed", isHidden ? "true" : "false");
    eyeIcon.innerHTML = isHidden
        ? '<path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2 12C3.9 8 7.4 5.5 12 5.5C13.8 5.5 15.4 5.9 16.8 6.7M20.2 9.4C20.9 10.2 21.5 11 22 12C20.1 16 16.6 18.5 12 18.5C8.2 18.5 5.2 16.8 3.2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>'
        : '<path d="M2 12C3.9 8 7.4 5.5 12 5.5C16.6 5.5 20.1 8 22 12C20.1 16 16.6 18.5 12 18.5C7.4 18.5 3.9 16 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>';
}

const loginBtn = document.getElementById("loginBtn");
if(loginBtn){
    loginBtn.addEventListener("click", login);
}
const forgotPasswordLink = document.getElementById("forgotPasswordLink");
if(forgotPasswordLink){
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        forgotPassword();
    });
}
const passwordToggle = document.getElementById("passwordToggle");
if(passwordToggle){
    passwordToggle.addEventListener("click", togglePassword);
}
const companyCodeEl = document.getElementById("companyCode");
if(companyCodeEl){
    companyCodeEl.addEventListener("input", () => {
        const raw = String(companyCodeEl.value || "");
        companyCodeEl.value = raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
        if(companyBrandingDebounce){
            clearTimeout(companyBrandingDebounce);
        }
        companyBrandingDebounce = setTimeout(() => {
            fetchCompanyBrandingByCode(companyCodeEl.value);
        }, 250);
    });
    companyCodeEl.addEventListener("blur", () => {
        fetchCompanyBrandingByCode(companyCodeEl.value);
    });
}
["companyCode", "email", "password"].forEach((id) => {
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener("keydown", (e) => {
        if(e.key === "Enter"){
            e.preventDefault();
            login();
        }
    });
});
const loginUserInput = document.getElementById("email");
if(loginUserInput){
    loginUserInput.addEventListener("blur", applyRememberedCompanyCodeAnyDevice);
    loginUserInput.addEventListener("input", () => {
        const companyInput = document.getElementById("companyCode");
        if(companyInput && !String(companyInput.value || "").trim()){
            applyRememberedCompanyCode();
        }
    });
}
applyRememberedCompanyCode();
applyCachedLoginLogo();
if(companyCodeEl && String(companyCodeEl.value || "").trim()){
    fetchCompanyBrandingByCode(companyCodeEl.value);
}
setTimeout(() => {
    const companyInput = document.getElementById("companyCode");
    const currentCode = String(companyInput && companyInput.value ? companyInput.value : "").trim();
    if(currentCode){
        fetchCompanyBrandingByCode(currentCode);
        return;
    }
    applyRememberedCompanyCodeAnyDevice();
}, 250);
