const userSelectEl = document.getElementById("userSelect");
        const databaseSelectEl = document.getElementById("databaseSelect");
        const companySelectEl = document.getElementById("companySelect");
        const mappingEmailEl = document.getElementById("mappingEmail");
        const userCompanyNameEl = document.getElementById("userCompanyName");
        const databaseCompanyNameEl = document.getElementById("databaseCompanyName");
        const selectedCompanyNameEl = document.getElementById("selectedCompanyName");
        const selectedCompanyCodeEl = document.getElementById("selectedCompanyCode");
        const selectedCompanyEmailEl = document.getElementById("selectedCompanyEmail");
        const selectedCompanyLogoImgEl = document.getElementById("selectedCompanyLogoImg");
        const selectedCompanyLogoFileEl = document.getElementById("selectedCompanyLogoFile");
        const verifyStatusEl = document.getElementById("verifyStatus");
        const verifyBtnEl = document.getElementById("verifyBtn");
        const mappedBtnEl = document.getElementById("mappedBtn");
        const mappedEntriesBodyEl = document.getElementById("mappedEntriesBody");

        const MAPPED_PATH = "/users/mapped.html";
        let canAddMapped = false;
        let isVerified = false;
        let users = [];
        let databases = [];
        let companies = [];
        let mappedEntriesCache = [];
        const DEFAULT_COMPANY_LOGO = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='10' fill='%23eef3f9'/%3E%3Cpath d='M16 42l10-11 8 9 7-8 7 10' stroke='%2390a4b8' stroke-width='3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='24' cy='23' r='4' fill='%2390a4b8'/%3E%3C/svg%3E";

        function findUser(userId){
            return users.find((u) => Number(u.id) === Number(userId)) || null;
        }

        function findDb(name){
            const target = String(name || "").trim().toLowerCase();
            return databases.find((d) => String(d.name || "").trim().toLowerCase() === target) || null;
        }

        function findCompany(companyId){
            return companies.find((c) => Number(c.id) === Number(companyId)) || null;
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

        function setCompanyLogoPreview(company){
            if(!selectedCompanyLogoImgEl || !selectedCompanyLogoFileEl) return;
            if(!company){
                selectedCompanyLogoImgEl.src = DEFAULT_COMPANY_LOGO;
                selectedCompanyLogoFileEl.textContent = "-";
                return;
            }
            const logoSource = String(company.logo_data_url || company.logo_url || company.logo_path || "").trim();
            const logoUrl = resolveLogoUrl(logoSource);
            selectedCompanyLogoFileEl.textContent = String(company.logo_file_name || "-");
            selectedCompanyLogoImgEl.onerror = () => {
                selectedCompanyLogoImgEl.onerror = null;
                selectedCompanyLogoImgEl.src = DEFAULT_COMPANY_LOGO;
            };
            selectedCompanyLogoImgEl.src = logoUrl || DEFAULT_COMPANY_LOGO;
        }

        function updateNameViews(){
            const user = findUser(userSelectEl.value);
            const db = findDb(databaseSelectEl.value);
            const company = findCompany(companySelectEl.value);
            userCompanyNameEl.textContent = user ? String(user.company_name || "-") : "-";
            databaseCompanyNameEl.textContent = db ? String(db.company_name || "-") : "-";
            selectedCompanyNameEl.textContent = company ? String(company.company_name || "-") : "-";
            selectedCompanyCodeEl.textContent = company ? String(company.company_code || "-") : "-";
            selectedCompanyEmailEl.textContent = company ? String(company.email || "-") : "-";
            setCompanyLogoPreview(company);
            if(company){
                mappingEmailEl.value = String(company.email || "").trim().toLowerCase();
            }
        }

        function resetVerifyState(){
            isVerified = false;
            verifyStatusEl.textContent = "Not verified";
        }

        function selectedPayload(){
            return {
                user_id: Number(userSelectEl.value || 0),
                database_name: String(databaseSelectEl.value || "").trim().toLowerCase(),
                company_profile_id: Number(companySelectEl.value || 0),
                email: String(mappingEmailEl.value || "").trim().toLowerCase()
            };
        }

        async function loadMeta(){
            const res = await request("/users/mapped/meta", "GET");
            users = Array.isArray(res.users) ? res.users : [];
            databases = Array.isArray(res.databases) ? res.databases : [];
            companies = Array.isArray(res.companies) ? res.companies : [];

            userSelectEl.innerHTML = `<option value="">Select user</option>`;
            users.forEach((u) => {
                const opt = document.createElement("option");
                opt.value = String(u.id);
                opt.textContent = `${u.username || "User"} (${u.email || ""})`;
                userSelectEl.appendChild(opt);
            });

            databaseSelectEl.innerHTML = `<option value="">Select database</option>`;
            databases.forEach((d) => {
                const opt = document.createElement("option");
                opt.value = String(d.name || "");
                opt.textContent = String(d.label || d.name || "");
                databaseSelectEl.appendChild(opt);
            });

            companySelectEl.innerHTML = `<option value="">Select company</option>`;
            companies.forEach((c) => {
                const opt = document.createElement("option");
                opt.value = String(c.id);
                const code = String(c.company_code || "").trim();
                const email = String(c.email || "").trim();
                opt.textContent = `${String(c.company_name || "")}${code ? ` [${code}]` : ""}${email ? ` (${email})` : ""}`;
                companySelectEl.appendChild(opt);
            });
        }

        async function loadUserMapping(){
            const userId = Number(userSelectEl.value || 0);
            if(!userId){
                return;
            }
            try{
                const res = await request(`/users/mapped/${userId}`, "GET");
                const m = res && res.mapping ? res.mapping : null;
                if(!m) return;
                if(m.database_name){
                    databaseSelectEl.value = String(m.database_name).toLowerCase();
                }
                if(m.company_profile_id){
                    companySelectEl.value = String(m.company_profile_id);
                }
                if(m.company_name){
                    selectedCompanyNameEl.textContent = String(m.company_name || "-");
                }
                if(m.company_code){
                    selectedCompanyCodeEl.textContent = String(m.company_code || "-");
                }
                if(m.email){
                    selectedCompanyEmailEl.textContent = String(m.email || "-");
                }
                if(m.mapped_email){
                    mappingEmailEl.value = String(m.mapped_email || "").trim().toLowerCase();
                }else if(m.email){
                    mappingEmailEl.value = String(m.email || "").trim().toLowerCase();
                }
                setCompanyLogoPreview({
                    logo_data_url: m.logo_data_url,
                    logo_url: m.logo_url,
                    logo_path: m.logo_path,
                    logo_file_name: m.logo_file_name,
                });
            }catch(_err){
            }
        }

        async function verifyMapping(){
            if(!canAddMapped){
                alert("You do not have add permission for User Mapped page.");
                return;
            }
            const payload = selectedPayload();
            if(!payload.user_id || !payload.database_name || !payload.company_profile_id || !payload.email){
                alert("Please select user, database, company and email.");
                return;
            }
            try{
                const res = await request("/users/mapped/verify", "POST", payload);
                isVerified = !!res.verified;
                if(res.names){
                    userCompanyNameEl.textContent = String(res.names.user_company_name || "-");
                    databaseCompanyNameEl.textContent = String(res.names.database_company_name || "-");
                    selectedCompanyNameEl.textContent = String(res.names.selected_company_name || "-");
                }
                verifyStatusEl.textContent = isVerified ? "Verified" : "Not Verified (company names mismatch)";
                showMessageBox(res.message || (isVerified ? "Verified" : "Not verified"), isVerified ? "success" : "error");
            }catch(err){
                isVerified = false;
                verifyStatusEl.textContent = "Not verified";
                alert(err.message || "Failed to verify mapping");
            }
        }

        async function saveMapping(){
            if(!canAddMapped){
                alert("You do not have add permission for User Mapped page.");
                return;
            }
            if(!isVerified){
                alert("Please verify before mapped.");
                return;
            }
            const payload = selectedPayload();
            if(!payload.user_id || !payload.database_name || !payload.company_profile_id || !payload.email){
                alert("Please select user, database, company and email.");
                return;
            }
            try{
                const res = await request("/users/mapped/save", "POST", payload);
                showMessageBox(res.message || "User mapped successfully");
                upsertMappedEntryFromSave(res && res.mapping ? res.mapping : null);
                await loadMappedEntries();
            }catch(err){
                alert(err.message || "Failed to save mapping");
            }
        }

        function escapeHtml(value){
            return String(value == null ? "" : value)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function renderMappedEntries(entries){
            if(!mappedEntriesBodyEl) return;
            if(!Array.isArray(entries) || !entries.length){
                mappedEntriesBodyEl.innerHTML = `<tr><td colspan="7">No mapped data yet.</td></tr>`;
                return;
            }
            mappedEntriesCache = entries.slice();
            mappedEntriesBodyEl.innerHTML = entries.map((row) => {
                const userLabel = row.username
                    ? `${row.username}${row.company_code ? ` [${row.company_code}]` : ""}`
                    : `User #${Number(row.user_id || 0) || "-"}`;
                return `<tr>
                    <td>${escapeHtml(userLabel)}</td>
                    <td>${escapeHtml(row.user_email || "-")}</td>
                    <td>${escapeHtml(row.database_name || "-")}</td>
                    <td>${escapeHtml(row.company_name || "-")}</td>
                    <td>${escapeHtml(row.company_email || "-")}</td>
                    <td>${escapeHtml(row.mapped_email || "-")}</td>
                    <td>${row.is_verified ? "Yes" : "No"}</td>
                </tr>`;
            }).join("");
        }

        function upsertMappedEntryFromSave(mapping){
            if(!mapping || !mappedEntriesBodyEl) return;
            const user = findUser(mapping.user_id);
            const db = findDb(mapping.database_name);
            const company = findCompany(mapping.company_profile_id);
            const next = {
                user_id: Number(mapping.user_id || 0),
                username: user ? String(user.username || "").trim() : "",
                user_email: user ? String(user.email || "").trim().toLowerCase() : "",
                database_name: String(mapping.database_name || "").trim().toLowerCase(),
                company_name: String(mapping.company_name || (company ? company.company_name : "") || "").trim(),
                company_code: String(mapping.company_code || (company ? company.company_code : "") || "").trim().toUpperCase(),
                company_email: String(mapping.email || (company ? company.email : "") || "").trim().toLowerCase(),
                mapped_email: String(mapping.mapped_email || mapping.email || "").trim().toLowerCase(),
                is_verified: true,
            };
            const idx = mappedEntriesCache.findIndex((x) => Number(x.user_id || 0) === next.user_id);
            if(idx >= 0){
                mappedEntriesCache.splice(idx, 1, { ...mappedEntriesCache[idx], ...next });
            }else{
                mappedEntriesCache.unshift(next);
            }
            renderMappedEntries(mappedEntriesCache);
        }

        async function loadMappedEntries(){
            if(!mappedEntriesBodyEl) return;
            try{
                const res = await request("/users/mapped/entries", "GET");
                renderMappedEntries(Array.isArray(res.entries) ? res.entries : []);
            }catch(err){
                mappedEntriesBodyEl.innerHTML = `<tr><td colspan="7">${escapeHtml(err.message || "Failed to load mapped data.")}</td></tr>`;
            }
        }

        async function applyPermissionState(){
            if(typeof window.__waitForUserAccessPermissions === "function"){
                await window.__waitForUserAccessPermissions();
            }
            canAddMapped = !!window.hasUserActionPermission && window.hasUserActionPermission(MAPPED_PATH, "add");
            verifyBtnEl.style.display = canAddMapped ? "" : "none";
            mappedBtnEl.style.display = canAddMapped ? "" : "none";
        }

        userSelectEl.addEventListener("change", async () => {
            resetVerifyState();
            updateNameViews();
            await loadUserMapping();
            updateNameViews();
        });
        databaseSelectEl.addEventListener("change", () => {
            resetVerifyState();
            updateNameViews();
        });
        companySelectEl.addEventListener("change", () => {
            resetVerifyState();
            updateNameViews();
        });
        mappingEmailEl.addEventListener("input", () => {
            resetVerifyState();
        });

        window.verifyMapping = verifyMapping;
        window.saveMapping = saveMapping;

        (async function init(){
            const role = (localStorage.getItem("role") || "").toLowerCase();
            if(role !== "admin"){
                alert("Only admin can access this page.");
                window.location.href = "../dashboard.html";
                return;
            }
            await applyPermissionState();
            await loadMeta();
            updateNameViews();
            await loadMappedEntries();
        })();
