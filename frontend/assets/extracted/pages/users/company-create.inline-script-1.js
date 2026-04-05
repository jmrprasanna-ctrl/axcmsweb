const companyNameEl = document.getElementById("companyName");
        const companyCodeEl = document.getElementById("companyCode");
        const companyEmailEl = document.getElementById("companyEmail");
        const logoFileEl = document.getElementById("logoFile");
        const saveCompanyBtnEl = document.getElementById("saveCompanyBtn");
        const companyTableBodyEl = document.getElementById("companyTableBody");
        const COMPANY_CREATE_PATH = "/users/company-create.html";
        const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".bmp", ".gif", ".tiff", ".tif", ".png"]);

        let canAddCompany = false;
        let canDeleteCompany = false;

        function formatDate(value){
            if(!value) return "-";
            const dt = new Date(value);
            if(Number.isNaN(dt.getTime())) return "-";
            return dt.toLocaleDateString();
        }

        function normalizeCompanyUppercase(value){
            return String(value || "").toUpperCase();
        }

        function normalizeCodeUppercase(value){
            return String(value || "")
                .toUpperCase()
                .replace(/[^A-Z0-9_-]+/g, "");
        }

        function escapeHtml(value){
            return String(value || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
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

        function buildLogoCellHtml(row){
            const fileName = String(row.logo_file_name || "").trim();
            const logoDataUrl = String(row.logo_data_url || "").trim();
            const logoSource = logoDataUrl || String(row.logo_url || row.logo_path || "").trim();
            const logoUrl = resolveLogoUrl(logoSource);
            const fallback = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='10' fill='%23eef3f9'/%3E%3Cpath d='M16 42l10-11 8 9 7-8 7 10' stroke='%2390a4b8' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='24' cy='23' r='4' fill='%2390a4b8'/%3E%3C/svg%3E";
            if(!logoUrl){
                return `<span class="company-logo-file">${escapeHtml(fileName || "-")}</span>`;
            }
            const versionTag = row.updated_at ? `?v=${encodeURIComponent(String(row.updated_at))}` : "";
            return `
                <div class="company-logo-cell">
                    <img
                        src="${escapeHtml(`${logoUrl}${versionTag}`)}"
                        alt="${escapeHtml(fileName || "Company Logo")}"
                        class="company-logo-thumb"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${fallback}'"
                    >
                    <span class="company-logo-file">${escapeHtml(fileName || "logo")}</span>
                </div>
            `;
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
            if(!file) return "Please select company logo.";
            const name = String(file.name || "").trim();
            const dot = name.lastIndexOf(".");
            const ext = dot >= 0 ? name.slice(dot).toLowerCase() : "";
            if(!ALLOWED_EXT.has(ext)){
                return "Invalid logo format. Allowed: .jpg, .jpeg, .bmp, .gif, .tiff, .png";
            }
            return "";
        }

        async function loadCompanies(){
            companyTableBodyEl.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
            try{
                const res = await request("/users/companies", "GET");
                const rows = Array.isArray(res.companies) ? res.companies : [];
                if(!rows.length){
                    companyTableBodyEl.innerHTML = `<tr><td colspan="7">No companies found.</td></tr>`;
                    return;
                }
                companyTableBodyEl.innerHTML = "";
                rows.forEach((row) => {
                    const tr = document.createElement("tr");
                    const deleteAction = canDeleteCompany
                        ? `<button class="btn btn-secondary" type="button" data-delete-company-id="${Number(row.id || 0)}" style="min-width:90px;">Delete</button>`
                        : `<span>-</span>`;
                    const mappedCount = Number(row.mapped_users_count || 0);
                    const mappedText = mappedCount > 0 ? `Yes (${mappedCount})` : "No";
                    tr.innerHTML = `
                        <td>${String(row.company_name || "")}</td>
                        <td>${String(row.company_code || "")}</td>
                        <td>${String(row.email || "")}</td>
                        <td>${mappedText}</td>
                        <td>${buildLogoCellHtml(row)}</td>
                        <td>${formatDate(row.created_at)}</td>
                        <td class="actions">${deleteAction}</td>
                    `;
                    companyTableBodyEl.appendChild(tr);
                });
            }catch(err){
                companyTableBodyEl.innerHTML = `<tr><td colspan="7">${String(err.message || "Failed to load companies")}</td></tr>`;
            }
        }

        async function saveCompany(){
            if(!canAddCompany){
                alert("You do not have add permission for Company Create page.");
                return;
            }
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

            try{
                const fileData = await readFileAsDataURL(file);
                const saveRes = await request("/users/companies/create", "POST", {
                    company_name: normalizeCompanyUppercase(companyName),
                    company_code: companyCode,
                    email: companyEmail,
                    logo_file_name: String(file.name || "").trim(),
                    logo_file_data_base64: fileData
                });
                showMessageBox(String(saveRes?.message || "Company saved"));
                companyNameEl.value = "";
                companyCodeEl.value = "";
                companyEmailEl.value = "";
                logoFileEl.value = "";
                await loadCompanies();
            }catch(err){
                alert(err.message || "Failed to create company");
            }
        }

        async function deleteCompany(companyId){
            if(!canDeleteCompany){
                alert("You do not have delete permission for Company Create page.");
                return;
            }
            const id = Number(companyId || 0);
            if(!Number.isFinite(id) || id <= 0) return;
            const ok = window.confirm("Delete this company and logo folder?");
            if(!ok) return;
            try{
                await request(`/users/companies/${id}`, "DELETE");
                showMessageBox("Company deleted");
                await loadCompanies();
            }catch(err){
                alert(err.message || "Failed to delete company");
            }
        }

        async function applyPermissionState(){
            if(typeof window.__waitForUserAccessPermissions === "function"){
                await window.__waitForUserAccessPermissions();
            }
            canAddCompany = !!window.hasUserActionPermission && window.hasUserActionPermission(COMPANY_CREATE_PATH, "add");
            canDeleteCompany = !!window.hasUserActionPermission && window.hasUserActionPermission(COMPANY_CREATE_PATH, "delete");
            saveCompanyBtnEl.style.display = canAddCompany ? "" : "none";
        }

        companyTableBodyEl.addEventListener("click", async (ev) => {
            const btn = ev.target.closest("button[data-delete-company-id]");
            if(!btn) return;
            await deleteCompany(btn.getAttribute("data-delete-company-id"));
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

        window.saveCompany = saveCompany;

        (async function init(){
            const role = (localStorage.getItem("role") || "").toLowerCase();
            if(role !== "admin"){
                alert("Only admin can access this page.");
                window.location.href = "../dashboard.html";
                return;
            }
            await applyPermissionState();
            await loadCompanies();
        })();
