        const userSelectEl = document.getElementById("userSelect");
        const databaseSelectEl = document.getElementById("databaseSelect");
        const superUserCheckboxEl = document.getElementById("superUserCheckbox");
        const accessMatrixEl = document.getElementById("accessMatrix");
        const userAccessBackBtnEl = document.getElementById("userAccessBackBtn");
        const accessSearchInputEl = document.getElementById("accessSearchInput");
        const showSelectedOnlyEl = document.getElementById("showSelectedOnly");
        let moduleOptions = [];
        let defaultDatabaseName = "axiscmsdb";

        function toActionKey(path, action){
            return `${String(path || "").trim().toLowerCase()}::${String(action || "").trim().toLowerCase()}`;
        }

        function normalizeActionLabel(action){
            const val = String(action || "").trim().toLowerCase();
            if(val === "view") return "View";
            if(val === "add") return "Add";
            if(val === "edit") return "Edit";
            if(val === "delete") return "Delete";
            return val;
        }

        function getSelectedActionValues(){
            return Array.from(accessMatrixEl.querySelectorAll("input[type='checkbox'][data-action-key]:checked"))
                .map((cb) => cb.dataset.actionKey)
                .filter(Boolean);
        }

        function renderAccessMatrix(){
            accessMatrixEl.innerHTML = "";
            moduleOptions.forEach((group) => {
                const card = document.createElement("div");
                card.className = "module-card";
                card.dataset.moduleName = String(group.module || "").toLowerCase();

                const header = document.createElement("div");
                header.className = "module-head";
                const heading = document.createElement("span");
                heading.textContent = group.module || "Module";
                const meta = document.createElement("span");
                meta.className = "module-meta";
                meta.textContent = `${Array.isArray(group.items) ? group.items.length : 0} pages`;
                header.appendChild(heading);
                header.appendChild(meta);
                card.appendChild(header);

                const table = document.createElement("table");
                table.className = "matrix-table";
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th class="check-col">View</th>
                            <th class="check-col">Add</th>
                            <th class="check-col">Edit</th>
                            <th class="check-col">Delete</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;

                const tbody = table.querySelector("tbody");
                (Array.isArray(group.items) ? group.items : []).forEach((item) => {
                    const actions = new Set((Array.isArray(item.actions) ? item.actions : []).map((a) => String(a || "").toLowerCase()));
                    const row = document.createElement("tr");
                    const rowSearchBlob = `${item.label || ""} ${item.path || ""}`.toLowerCase();
                    row.dataset.searchText = rowSearchBlob;

                    const pageCell = document.createElement("td");
                    pageCell.innerHTML = `
                        <div>${item.label || item.path || ""}</div>
                        <div class="path-hint">${item.path || ""}</div>
                    `;
                    row.appendChild(pageCell);

                    ["view", "add", "edit", "delete"].forEach((action) => {
                        const cell = document.createElement("td");
                        cell.className = "check-col";
                        if(actions.has(action)){
                            const cb = document.createElement("input");
                            cb.type = "checkbox";
                            cb.dataset.path = item.path || "";
                            cb.dataset.action = action;
                            cb.dataset.actionKey = toActionKey(item.path, action);
                            cb.title = `${item.label || item.path} - ${normalizeActionLabel(action)}`;
                            cell.appendChild(cb);
                        }else{
                            cell.textContent = "-";
                        }
                        row.appendChild(cell);
                    });

                    tbody.appendChild(row);
                });

                card.appendChild(table);
                accessMatrixEl.appendChild(card);
            });
            applyMatrixFilters();
        }

        function applyMatrixFilters(){
            const q = String(accessSearchInputEl?.value || "").trim().toLowerCase();
            const showSelectedOnly = !!showSelectedOnlyEl?.checked;
            accessMatrixEl.querySelectorAll(".module-card").forEach((card) => {
                const moduleName = String(card.dataset.moduleName || "").toLowerCase();
                let visibleRows = 0;
                card.querySelectorAll("tbody tr").forEach((row) => {
                    const rowText = String(row.dataset.searchText || "").toLowerCase();
                    const queryMatch = !q || rowText.includes(q) || moduleName.includes(q);
                    const hasChecked = !!row.querySelector("input[type='checkbox'][data-action-key]:checked");
                    const selectedMatch = !showSelectedOnly || hasChecked;
                    const rowVisible = queryMatch && selectedMatch;
                    row.style.display = rowVisible ? "" : "none";
                    if(rowVisible) visibleRows += 1;
                });
                card.style.display = visibleRows > 0 ? "" : "none";
            });
        }

        function setCheckedActions(actionKeys){
            const set = new Set((Array.isArray(actionKeys) ? actionKeys : []).map((x) => String(x || "").trim().toLowerCase()));
            accessMatrixEl.querySelectorAll("input[type='checkbox'][data-action-key]").forEach((cb) => {
                cb.checked = set.has(String(cb.dataset.actionKey || "").toLowerCase());
            });
            applyMatrixFilters();
        }

        async function loadUsers(){
            try{
                const res = await request("/users/access-users", "GET");
                const users = Array.isArray(res.users) ? res.users : [];
                const preferredDb = String(localStorage.getItem("selectedDatabaseName") || "").trim().toLowerCase();
                const dedupedMap = new Map();
                users.forEach((u) => {
                    const dbName = String(u.database_name || "").trim().toLowerCase();
                    const identity = String(u.email || u.username || "").trim().toLowerCase();
                    const role = String(u.role || "").trim().toLowerCase();
                    if (!identity) return;
                    const key = `${identity}::${role}`;
                    const prev = dedupedMap.get(key);
                    if (!prev) {
                        dedupedMap.set(key, u);
                        return;
                    }
                    const prevDb = String(prev.database_name || "").trim().toLowerCase();
                    const pickCurrentDb = preferredDb && dbName === preferredDb && prevDb !== preferredDb;
                    const pickAxisAsFallback = !preferredDb && dbName === "axiscmsdb" && prevDb !== "axiscmsdb";
                    if (pickCurrentDb || pickAxisAsFallback) {
                        dedupedMap.set(key, u);
                    }
                });
                const finalUsers = Array.from(dedupedMap.values());
                userSelectEl.innerHTML = `<option value="">Select user</option>`;
                const seenOptionKeys = new Set();
                finalUsers.forEach((u) => {
                    const dbName = String(u.database_name || "").trim().toLowerCase();
                    const identity = String(u.email || u.username || "").trim().toLowerCase();
                    const role = String(u.role || "").trim().toLowerCase();
                    const optionKey = `${dbName}::${identity}::${role}`;
                    if (seenOptionKeys.has(optionKey)) return;
                    seenOptionKeys.add(optionKey);
                    const opt = document.createElement("option");
                    opt.value = u.selection_key;
                    opt.textContent = u.label || `${u.username} (${u.email})`;
                    opt.dataset.databaseName = String(u.database_name || "").trim().toLowerCase();
                    opt.dataset.mappedDatabaseName = String(u.mapped_database_name || "").trim().toLowerCase();
                    opt.dataset.accessDatabaseName = String(u.access_database_name || "").trim().toLowerCase();
                    opt.dataset.defaultDatabaseName = String(u.default_database_name || u.database_name || "").trim().toLowerCase();
                    userSelectEl.appendChild(opt);
                });
            }catch(err){
                alert(err.message || "Failed to load users");
            }
        }

        async function loadAccessPages(){
            try{
                const res = await request("/users/access-pages", "GET");
                moduleOptions = Array.isArray(res.modules) ? res.modules : [];
                renderAccessMatrix();
            }catch(err){
                alert(err.message || "Failed to load access pages");
            }
        }

        async function loadDatabases(){
            try{
                const res = await request("/users/databases", "GET");
                const rows = Array.isArray(res.databases) ? res.databases : [];
                const normalizedRows = [];
                const seen = new Set();
                rows.forEach((entry) => {
                    const dbName = String(entry?.name || entry || "").trim().toLowerCase();
                    if(!dbName || seen.has(dbName)) return;
                    seen.add(dbName);
                    normalizedRows.push({
                        name: dbName,
                        label: String(entry?.label || dbName).trim() || dbName
                    });
                });
                const currentDb = String(res.current || "").trim().toLowerCase();
                databaseSelectEl.innerHTML = `<option value="">Select database</option>`;
                normalizedRows.forEach((entry) => {
                    const opt = document.createElement("option");
                    opt.value = entry.name;
                    opt.textContent = entry.label;
                    databaseSelectEl.appendChild(opt);
                });
                if(normalizedRows.some((x) => x.name === "axiscmsdb")){
                    defaultDatabaseName = "axiscmsdb";
                }else if(currentDb){
                    defaultDatabaseName = currentDb;
                }else if(normalizedRows.length){
                    defaultDatabaseName = normalizedRows[0].name;
                }
                if(defaultDatabaseName){
                    databaseSelectEl.value = defaultDatabaseName;
                }
            }catch(err){
                alert(err.message || "Failed to load databases");
            }
        }

        async function editAccess(){
            const selectedRef = String(userSelectEl.value || "").trim();
            if(!selectedRef){
                alert("Please select a user.");
                return;
            }
            try{
                const res = await request(`/users/access/${encodeURIComponent(selectedRef)}`, "GET");
                const actions = Array.isArray(res.allowed_actions) ? res.allowed_actions : [];
                setCheckedActions(actions);
                superUserCheckboxEl.checked = !!res.super_user;
                superUserCheckboxEl.disabled = res.can_edit_super_user === false;
                const selectedOption = userSelectEl.options[userSelectEl.selectedIndex];
                const optionMappedDb = String(selectedOption?.dataset?.mappedDatabaseName || "").trim().toLowerCase();
                const optionDefaultDb = String(selectedOption?.dataset?.defaultDatabaseName || "").trim().toLowerCase();
                const serverMappedDb = String(res.mapped_database_name || "").trim().toLowerCase();
                const serverDefaultDb = String(res.default_database_name || "").trim().toLowerCase();
                const serverAccessDb = String(res.database_name || "").trim().toLowerCase();
                const nextDb = serverMappedDb || optionMappedDb || serverDefaultDb || optionDefaultDb || serverAccessDb || defaultDatabaseName;
                if(nextDb){
                    databaseSelectEl.value = nextDb;
                }
                showMessageBox("Access loaded");
            }catch(err){
                alert(err.message || "Failed to load access settings");
            }
        }

        async function saveAccess(){
            const selectedRef = String(userSelectEl.value || "").trim();
            if(!selectedRef){
                alert("Please select a user.");
                return;
            }

            const allowedActions = getSelectedActionValues();
            const allowedPages = Array.from(new Set(
                allowedActions
                    .filter((k) => String(k).toLowerCase().endsWith("::view"))
                    .map((k) => k.slice(0, k.lastIndexOf("::")))
            ));

            const payload = {
                allowed_actions: allowedActions,
                allowed_pages: allowedPages,
                database_name: databaseSelectEl.value || null,
                super_user: !!superUserCheckboxEl.checked
            };

            try{
                await request(`/users/access/${encodeURIComponent(selectedRef)}`, "PUT", payload);
                showMessageBox("Access saved");
            }catch(err){
                alert(err.message || "Failed to save access settings");
            }
        }

        function selectAllAccess(){
            accessMatrixEl.querySelectorAll("input[type='checkbox'][data-action-key]").forEach((cb) => {
                cb.checked = true;
            });
            applyMatrixFilters();
        }

        function clearAccess(){
            accessMatrixEl.querySelectorAll("input[type='checkbox'][data-action-key]").forEach((cb) => {
                cb.checked = false;
            });
            applyMatrixFilters();
        }

        userSelectEl.addEventListener("change", async () => {
            if(userSelectEl.value){
                const selectedOption = userSelectEl.options[userSelectEl.selectedIndex];
                const mappedDb = String(selectedOption?.dataset?.mappedDatabaseName || selectedOption?.dataset?.databaseName || "").trim().toLowerCase();
                if(mappedDb){
                    databaseSelectEl.value = mappedDb;
                }
                await editAccess();
            }else{
                clearAccess();
                superUserCheckboxEl.checked = false;
                superUserCheckboxEl.disabled = true;
                if(defaultDatabaseName){
                    databaseSelectEl.value = defaultDatabaseName;
                }
            }
        });

        const saveAccessBtn = document.getElementById("saveAccessBtn");
        if(saveAccessBtn){
            saveAccessBtn.addEventListener("click", saveAccess);
        }
        const loadAccessBtn = document.getElementById("loadAccessBtn");
        if(loadAccessBtn){
            loadAccessBtn.addEventListener("click", editAccess);
        }
        const selectAllAccessBtn = document.getElementById("selectAllAccessBtn");
        if(selectAllAccessBtn){
            selectAllAccessBtn.addEventListener("click", selectAllAccess);
        }
        const clearAccessBtn = document.getElementById("clearAccessBtn");
        if(clearAccessBtn){
            clearAccessBtn.addEventListener("click", clearAccess);
        }
        if(accessSearchInputEl){
            accessSearchInputEl.addEventListener("input", applyMatrixFilters);
        }
        if(showSelectedOnlyEl){
            showSelectedOnlyEl.addEventListener("change", applyMatrixFilters);
        }
        accessMatrixEl.addEventListener("change", (ev) => {
            const target = ev.target;
            if(target && target.matches("input[type='checkbox'][data-action-key]")){
                applyMatrixFilters();
            }
        });
        if(userAccessBackBtnEl){
            userAccessBackBtnEl.addEventListener("click", (ev) => {
                ev.preventDefault();
                const target = "../dashboard.html";
                try{
                    window.location.href = target;
                }catch(_err){
                    window.location.assign(target);
                }
            });
        }

        (async function init(){
            const role = (localStorage.getItem("role") || "").toLowerCase();
            if(role !== "admin"){
                alert("Only admin can access this page.");
                window.location.href = "../dashboard.html";
                return;
            }
            await Promise.all([loadUsers(), loadAccessPages(), loadDatabases()]);
            superUserCheckboxEl.checked = false;
            superUserCheckboxEl.disabled = true;
            const queryUserId = new URLSearchParams(window.location.search).get("userId");
            if(queryUserId){
                const mainRef = `axiscmsdb:${queryUserId}`;
                userSelectEl.value = mainRef;
                if(userSelectEl.value){
                    await editAccess();
                }
            }
        })();
