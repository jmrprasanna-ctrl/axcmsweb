        async function loadUsers(){
            try{
                const users = await request("/users","GET");
                const tbody = document.getElementById('user-table-body');
                tbody.innerHTML = '';
                users.forEach(u => {
                    const row = document.createElement('tr');
                    row.className = 'user-row-open';
                    row.style.cursor = 'pointer';
                    row.addEventListener("click", () => {
                        window.location.href = `edit-user.html?id=${u.id}`;
                    });
                    row.innerHTML = `
                        <td>${u.id}</td>
                        <td>${u.username}</td>
                        <td>${u.company || ""}</td>
                        <td>${u.department || ""}</td>
                        <td>${u.telephone || ""}</td>
                        <td>${u.email}</td>
                        <td>${u.role}</td>
                    `;
                    tbody.appendChild(row);
                });
            }catch(err){
                alert(err.message || "Failed to load users");
            }
        }

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

async function loadSystemHealthPreview(){
            let healthLoadFailed = false;
            try{
                const health = await request("/health","GET");
                setHealthBadge("healthOverall", !!health.ok);
                setHealthBadge("healthDb", !!health.dbConnected);
                setHealthBadge("healthPgDump", !!health?.checks?.tools?.pg_dump?.available);
                setHealthBadge("healthPsql", !!health?.checks?.tools?.psql?.available);
                setHealthBadge("healthTplInvoice", !!health?.checks?.templateFiles?.invoice?.exists);
            }catch(_err){
                healthLoadFailed = true;
                setHealthBadge("healthOverall", false);
                setHealthBadge("healthDb", null);
                setHealthBadge("healthPgDump", null);
                setHealthBadge("healthPsql", null);
                setHealthBadge("healthTplInvoice", null);
            }

            const updated = document.getElementById("healthUpdatedAt");
            if(updated){
                const suffix = healthLoadFailed ? " (backend unavailable)" : "";
                updated.innerText = `Last updated: ${new Date().toLocaleString()}${suffix}`;
            }
        }

        let __userListBootstrapped = false;
        async function bootstrapUserListPage(){
            if(__userListBootstrapped) return;
            __userListBootstrapped = true;
            if(typeof window.__waitForUserAccessPermissions === "function"){
                await window.__waitForUserAccessPermissions();
            }
            const healthRefreshBtn = document.getElementById("healthRefreshBtn");
            if(healthRefreshBtn){
                healthRefreshBtn.addEventListener("click", loadSystemHealthPreview);
            }
            await loadSystemHealthPreview();
            await loadUsers();
        }

        if(document.readyState === "loading"){
            window.addEventListener("DOMContentLoaded", bootstrapUserListPage);
        }else{
            bootstrapUserListPage();
        }
