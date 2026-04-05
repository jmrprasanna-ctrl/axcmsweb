window.addEventListener("load", () => {
            const form = document.getElementById('addUserForm');
            const companySelect = document.getElementById('company');
            const companyHint = document.getElementById('companyHint');
            const togglePassword = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');
            const eyeIcon = document.getElementById('eyeIcon');
            const mappedCompanyName = String(localStorage.getItem("mappedCompanyName") || "").trim();

            function setCompanyHint(message, isError = false) {
                if (!companyHint) return;
                companyHint.textContent = String(message || "").trim();
                companyHint.style.color = isError ? "#b4232f" : "#5a7086";
            }

            async function loadMappedCompanies() {
                companySelect.innerHTML = '<option value="">Loading companies...</option>';
                setCompanyHint("Loading mapped companies...");
                try {
                    const res = await request("/users/my-companies", "GET");
                    const companies = Array.isArray(res?.companies) ? res.companies : [];
                    const seen = new Set();
                    const normalized = companies
                        .map((item) => ({
                            id: Number(item?.id || 0),
                            company_name: String(item?.company_name || "").trim(),
                            company_code: String(item?.company_code || "").trim().toUpperCase(),
                            is_mapped: Boolean(item?.is_mapped),
                            mapped_users_count: Number(item?.mapped_users_count || 0),
                            mapped_users_count_in_selected_db: Number(item?.mapped_users_count_in_selected_db || 0),
                        }))
                        .filter((item) => {
                            if (!item.company_name) return false;
                            const key = item.id > 0 ? `id:${item.id}` : `name:${item.company_name.toLowerCase()}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        })
                        .sort((a, b) => {
                            if (b.mapped_users_count_in_selected_db !== a.mapped_users_count_in_selected_db) {
                                return b.mapped_users_count_in_selected_db - a.mapped_users_count_in_selected_db;
                            }
                            if (b.mapped_users_count !== a.mapped_users_count) {
                                return b.mapped_users_count - a.mapped_users_count;
                            }
                            return String(a.company_name).localeCompare(String(b.company_name));
                        });

                    companySelect.innerHTML = '<option value="">Select company</option>';
                    normalized.forEach((item) => {
                        const label = item.company_code
                            ? `${item.company_name} [${item.company_code}]`
                            : item.company_name;
                        const opt = document.createElement("option");
                        opt.value = item.company_name;
                        opt.textContent = label;
                        opt.dataset.companyCode = item.company_code;
                        companySelect.appendChild(opt);
                    });

                    if (!normalized.length && mappedCompanyName) {
                        const opt = document.createElement("option");
                        opt.value = mappedCompanyName;
                        opt.textContent = mappedCompanyName;
                        companySelect.appendChild(opt);
                        companySelect.value = mappedCompanyName;
                        setCompanyHint("No mapped company rows found. Using your mapped company fallback.");
                        return;
                    }

                    if (normalized.length === 1) {
                        companySelect.selectedIndex = 1;
                    } else if (mappedCompanyName) {
                        const match = normalized.find((x) => x.company_name.toLowerCase() === mappedCompanyName.toLowerCase());
                        if (match) companySelect.value = match.company_name;
                    }

                    const mappedCount = normalized.filter((x) => x.is_mapped).length;
                    const selectedDbMappedCount = normalized.filter((x) => x.mapped_users_count_in_selected_db > 0).length;
                    if (normalized.length) {
                        setCompanyHint(
                            `Loaded ${normalized.length} companies${mappedCount ? ` (${mappedCount} mapped)` : ""}${selectedDbMappedCount ? `, ${selectedDbMappedCount} in current DB` : ""}.`
                        );
                    } else {
                        setCompanyHint("No companies available. Please map company first.", true);
                    }
                } catch (err) {
                    companySelect.innerHTML = '<option value="">Select company</option>';
                    if (mappedCompanyName) {
                        const opt = document.createElement("option");
                        opt.value = mappedCompanyName;
                        opt.textContent = mappedCompanyName;
                        companySelect.appendChild(opt);
                        companySelect.value = mappedCompanyName;
                        setCompanyHint("Using mapped company fallback due to API load issue.");
                    } else {
                        setCompanyHint(err.message || "Failed to load company list.", true);
                    }
                }
            }
            loadMappedCompanies();

            form.addEventListener('submit', async e => {
                e.preventDefault();
                const user = {
                    username: document.getElementById('username').value.trim(),
                    email: document.getElementById('email').value.trim(),
                    password: document.getElementById('password').value,
                    role: document.getElementById('role').value,
                    company: document.getElementById('company').value.trim(),
                    department: document.getElementById('department').value.trim(),
                    telephone: document.getElementById('tel').value.trim()
                };
                try{
                    await request("/users","POST",user);
                    showMessageBox("User saved successfully!");
                    form.reset();
                }catch(err){
                    alert(err.message || "Failed to add user");
                }
            });

            togglePassword.addEventListener("click", () => {
                const isPassword = passwordInput.type === "password";
                passwordInput.type = isPassword ? "text" : "password";
                togglePassword.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
                togglePassword.setAttribute("aria-pressed", isPassword ? "true" : "false");
                eyeIcon.innerHTML = isPassword
                    ? '<path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M2 12C3.9 8 7.4 5.5 12 5.5C13.8 5.5 15.4 5.9 16.8 6.7M20.2 9.4C20.9 10.2 21.5 11 22 12C20.1 16 16.6 18.5 12 18.5C8.2 18.5 5.2 16.8 3.2 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>'
                    : '<path d="M2 12C3.9 8 7.4 5.5 12 5.5C16.6 5.5 20.1 8 22 12C20.1 16 16.6 18.5 12 18.5C7.4 18.5 3.9 16 2 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" stroke="currentColor" stroke-width="1.8"/>';
            });
        });
