const companyNameEl = document.getElementById("companyName");
const companyCodeEl = document.getElementById("companyCode");
const companyEmailEl = document.getElementById("companyEmail");
const logoFileEl = document.getElementById("logoFile");
const updateCompanyBtnEl = document.getElementById("updateCompanyBtn");
const deleteCompanyBtnEl = document.getElementById("deleteCompanyBtn");
const companyLogoPreviewEl = document.getElementById("companyLogoPreview");

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".tif", ".png"]);
const COMPANY_CREATE_PATH = "/users/company-create.html";

let companyId = 0;
let currentCompany = null;

function normalizeCompanyUppercase(value){
    return String(value || "").toUpperCase();
}

function normalizeCodeUppercase(value){
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9_-]+/g, "");
}

function resolveLogoUrl(rawPath){
    const source = String(rawPath || "").trim();
    if(!source) return "";
    if(/^data:image\//i.test(source) || /^https?:\/\//i.test(source)){
        return source;
    }
    const clean = source
        .replace(/\\/g, "/")
        .replace(/^(\.\.\/|\.\/)+/g, "")
        .replace(/^backend\//i, "")
        .replace(/^\/+/, "");
    const apiBase = String(window.BASE_URL || "").trim().replace(/\/api$/i, "").replace(/\/+$/, "");
    if(!apiBase) return `/${clean}`;
    return `${apiBase}/${clean}`;
}

function setLogoPreview(source){
    const fallback = "../../assets/images/logo.png";
    const url = resolveLogoUrl(source);
    companyLogoPreviewEl.src = url || fallback;
    companyLogoPreviewEl.onerror = () => {
        companyLogoPreviewEl.src = fallback;
    };
}

function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.readAsDataURL(file);
    });
}

function validateLogoFile(file){
    if(!file) return "";
    const name = String(file.name || "").trim();
    const dot = name.lastIndexOf(".");
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
    if(!ALLOWED_EXT.has(ext)){
        return "Invalid logo format. Allowed: .jpg, .jpeg, .bmp, .gif, .tiff, .png";
    }
    return "";
}

function parseCompanyId(){
    const params = new URLSearchParams(window.location.search || "");
    return Number(params.get("id") || 0);
}

async function loadCompany(){
    const res = await request(`/users/companies/${companyId}`, "GET");
    const company = res && res.company ? res.company : null;
    if(!company){
        throw new Error("Company not found.");
    }
    currentCompany = company;
    companyNameEl.value = String(company.company_name || "");
    companyCodeEl.value = String(company.company_code || "");
    companyEmailEl.value = String(company.email || "");
    setLogoPreview(company.logo_data_url || company.logo_preview_url || company.logo_url || company.logo_path || "");
}

async function updateCompany(){
    const companyName = String(companyNameEl.value || "").trim();
    const companyCode = normalizeCodeUppercase(companyCodeEl.value || "");
    const companyEmail = String(companyEmailEl.value || "").trim().toLowerCase();
    const file = logoFileEl.files && logoFileEl.files[0];

    if(!companyName){
        alert("Please enter company name.");
        return;
    }
    if(!companyCode){
        alert("Please enter company code.");
        return;
    }
    if(!companyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)){
        alert("Please enter valid company email.");
        return;
    }

    const validationMessage = validateLogoFile(file);
    if(validationMessage){
        alert(validationMessage);
        return;
    }

    const payload = {
        company_name: normalizeCompanyUppercase(companyName),
        company_code: companyCode,
        email: companyEmail,
    };

    if(file){
        const fileData = await readFileAsDataURL(file);
        payload.logo_file_name = String(file.name || "").trim();
        payload.logo_file_data_base64 = fileData;
    }

    const res = await request(`/users/companies/${companyId}`, "PUT", payload);
    showMessageBox(String(res?.message || "Company updated"));
    window.location.href = "company-create.html";
}

async function deleteCompany(){
    const ok = window.confirm("Delete this company and logo folder?");
    if(!ok) return;
    await request(`/users/companies/${companyId}`, "DELETE");
    showMessageBox("Company deleted");
    window.location.href = "company-create.html";
}

async function applyPermissionState(){
    if(typeof window.__waitForUserAccessPermissions === "function"){
        await window.__waitForUserAccessPermissions();
    }
    const canEdit = !!window.hasUserActionPermission && (
        window.hasUserActionPermission(COMPANY_CREATE_PATH, "edit")
        || window.hasUserActionPermission(COMPANY_CREATE_PATH, "add")
    );
    if(!canEdit){
        alert("You do not have edit permission for Company page.");
        window.location.href = "company-create.html";
        return false;
    }
    const canDelete = !!window.hasUserActionPermission && window.hasUserActionPermission(COMPANY_CREATE_PATH, "delete");
    if(deleteCompanyBtnEl){
        deleteCompanyBtnEl.style.display = canDelete ? "" : "none";
    }
    return true;
}

async function init(){
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if(role !== "admin"){
        alert("Only admin can access this page.");
        window.location.href = "../dashboard.html";
        return;
    }
    companyId = parseCompanyId();
    if(!Number.isFinite(companyId) || companyId <= 0){
        alert("Invalid company id.");
        window.location.href = "company-create.html";
        return;
    }
    const allowed = await applyPermissionState();
    if(!allowed) return;

    try{
        await loadCompany();
    }catch(err){
        alert(err.message || "Failed to load company.");
        window.location.href = "company-create.html";
    }
}

updateCompanyBtnEl.addEventListener("click", async () => {
    try{
        await updateCompany();
    }catch(err){
        alert(err.message || "Failed to update company.");
    }
});

if(deleteCompanyBtnEl){
    deleteCompanyBtnEl.addEventListener("click", async () => {
        try{
            await deleteCompany();
        }catch(err){
            alert(err.message || "Failed to delete company.");
        }
    });
}

logoFileEl.addEventListener("change", async () => {
    const file = logoFileEl.files && logoFileEl.files[0];
    if(!file) return;
    const validationMessage = validateLogoFile(file);
    if(validationMessage){
        alert(validationMessage);
        logoFileEl.value = "";
        return;
    }
    try{
        const preview = await readFileAsDataURL(file);
        setLogoPreview(preview);
    }catch(_err){
    }
});

companyNameEl.style.textTransform = "uppercase";
companyNameEl.addEventListener("input", () => {
    const pos = companyNameEl.selectionStart;
    const upper = normalizeCompanyUppercase(companyNameEl.value);
    if(companyNameEl.value !== upper){
        companyNameEl.value = upper;
        if(typeof pos === "number"){
            companyNameEl.setSelectionRange(pos, pos);
        }
    }
});

companyCodeEl.style.textTransform = "uppercase";
companyCodeEl.addEventListener("input", () => {
    const pos = companyCodeEl.selectionStart;
    const upper = normalizeCodeUppercase(companyCodeEl.value);
    if(companyCodeEl.value !== upper){
        companyCodeEl.value = upper;
        if(typeof pos === "number"){
            companyCodeEl.setSelectionRange(pos, pos);
        }
    }
});

init();
