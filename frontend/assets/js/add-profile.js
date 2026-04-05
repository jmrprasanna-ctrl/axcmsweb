(function () {
    const PROFILE_PATH = "/users/profile-list.html";
    const DEFAULT_AVATAR_PLACEHOLDER = "../../assets/images/profile-placeholder.svg";
    const profileId = Number(new URLSearchParams(window.location.search).get("id") || 0);
    let pictureBase64 = "";
    let pictureName = "";
    let profileUsers = [];

    const els = {
        title: document.getElementById("formTitle"),
        picture: document.getElementById("profilePictureFile"),
        avatar: document.getElementById("profileAvatarPreview"),
        save: document.getElementById("saveProfileBtn"),
        del: document.getElementById("deleteProfileBtn"),
        profile_name: document.getElementById("profileName"),
        email: document.getElementById("profileEmail"),
        login_user: document.getElementById("profileLoginUser"),
        company_name: document.getElementById("profileCompanyName"),
        company_code: document.getElementById("profileCompanyCode"),
        department: document.getElementById("profileDepartment"),
        section: document.getElementById("profileSection"),
        address: document.getElementById("profileAddress"),
        telephone: document.getElementById("profileTel"),
        mobile: document.getElementById("profileMobile"),
    };

    function normalizeUpper(v) {
        return String(v || "").toUpperCase().replace(/[^A-Z0-9 _-]/g, "").trim();
    }

    function apiOrigin() {
        return String(BASE_URL || "").replace(/\/api\/?$/i, "");
    }

    function resolveProfileAvatarUrl(rawUrl) {
        const fallback = DEFAULT_AVATAR_PLACEHOLDER;
        const value = String(rawUrl || "").trim();
        if (!value) return fallback;
        if (/^data:image\//i.test(value)) return value;
        if (/^https?:\/\//i.test(value)) return value;
        try {
            const normalizedPath = value.startsWith("/") ? value : `/${value}`;
            return new URL(normalizedPath, `${apiOrigin()}/`).toString();
        } catch (_err) {
            return fallback;
        }
    }

    function setForm(data) {
        els.profile_name.value = String(data.profile_name || "");
        els.email.value = String(data.email || "");
        els.company_name.value = String(data.company_name || "");
        els.company_code.value = String(data.company_code || "");
        els.department.value = String(data.department || "");
        els.section.value = String(data.section || "");
        els.address.value = String(data.address || "");
        els.telephone.value = String(data.telephone || "");
        els.mobile.value = String(data.mobile || "");
        const selectedUserId = Number(data.user_id || 0);
        if (selectedUserId) {
            els.login_user.value = String(selectedUserId);
        }
        if (data.profile_picture_data_url || data.profile_picture_url || data.profile_picture_api_url) {
            els.avatar.src = resolveProfileAvatarUrl(data.profile_picture_data_url || data.profile_picture_url || data.profile_picture_api_url);
        } else {
            els.avatar.src = DEFAULT_AVATAR_PLACEHOLDER;
        }
    }

    function getSelectedProfileUser() {
        const selectedId = Number(els.login_user.value || 0);
        if (!selectedId) return null;
        return profileUsers.find((u) => Number(u.id || 0) === selectedId) || null;
    }

    async function autofillFromSelectedUser() {
        const selected = getSelectedProfileUser();
        if (!selected) return;
        if (selected.username && !String(els.profile_name.value || "").trim()) {
            els.profile_name.value = String(selected.username);
        }
        if (selected.company) els.company_name.value = String(selected.company);
        if (selected.company_code) els.company_code.value = normalizeUpper(selected.company_code);
        if (selected.department) els.department.value = String(selected.department);
        if (selected.telephone) els.telephone.value = String(selected.telephone);
        try {
            const mappedRes = await request(`/users/mapped/${Number(selected.id || 0)}`, "GET");
            const mapped = mappedRes && mappedRes.mapping ? mappedRes.mapping : null;
            if (mapped) {
                if (mapped.company_name) els.company_name.value = String(mapped.company_name).trim();
                if (mapped.company_code) els.company_code.value = normalizeUpper(mapped.company_code);
            }
        } catch (_err) {
        }
    }

    function getPayload() {
        const selected = getSelectedProfileUser();
        return {
            profile_name: String(els.profile_name.value || "").trim(),
            email: String(els.email.value || "").trim().toLowerCase(),
            user_id: Number(selected?.id || 0) || undefined,
            login_user: String(selected?.username || "").trim(),
            company_name: String(els.company_name.value || "").trim(),
            company_code: normalizeUpper(els.company_code.value),
            department: String(els.department.value || "").trim(),
            section: String(els.section.value || "").trim(),
            address: String(els.address.value || "").trim(),
            telephone: String(els.telephone.value || "").trim(),
            mobile: String(els.mobile.value || "").trim(),
            linked_database_name: String(selected?.source_database || localStorage.getItem("selectedDatabaseName") || "").trim().toLowerCase() || undefined,
            profile_picture_base64: pictureBase64 || undefined,
            profile_picture_name: pictureName || undefined,
        };
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Failed to read profile image file."));
            reader.readAsDataURL(file);
        });
    }

    async function ensurePicturePayloadReady() {
        const file = els.picture.files && els.picture.files[0];
        if (!file) return;
        if (!pictureName) pictureName = String(file.name || "profile");
        if (!pictureBase64) {
            const encoded = await fileToDataUrl(file);
            if (encoded) {
                pictureBase64 = encoded;
                els.avatar.src = pictureBase64;
            }
        }
    }

    function normalizeUserOptions(source) {
        const rows = Array.isArray(source)
            ? source
            : (Array.isArray(source?.users) ? source.users : []);
        return rows
            .map((u) => ({
                id: Number(u?.id || 0),
                username: String(u?.username || u?.login_user || "").trim(),
                email: String(u?.email || "").trim(),
                company: String(u?.company || u?.company_name || "").trim(),
                department: String(u?.department || "").trim(),
                telephone: String(u?.telephone || u?.mobile || "").trim(),
                source_database: String(u?.source_database || "").trim().toLowerCase(),
            }))
            .filter((u) => u.id > 0);
    }

    async function loadProfileUsers() {
        els.login_user.innerHTML = `<option value="">Loading login users...</option>`;
        try {
            let list = [];
            try {
                const res = await request("/users/profiles/user-options", "GET");
                list = normalizeUserOptions(res);
            } catch (_firstErr) {
                const fallback = await request("/users/assignable", "GET");
                list = normalizeUserOptions(fallback);
            }
            profileUsers = list;
            els.login_user.innerHTML = `<option value="">Select Login User</option>`;
            list.forEach((u) => {
                const opt = document.createElement("option");
                opt.value = String(u.id);
                opt.textContent = `${u.username || `User ${u.id}`}${u.email ? ` (${u.email})` : ""}`;
                els.login_user.appendChild(opt);
            });
            if (!list.length) {
                els.login_user.innerHTML = `<option value="">No login users found</option>`;
            }
        } catch (err) {
            profileUsers = [];
            els.login_user.innerHTML = `<option value="">Failed to load login users</option>`;
            showMessageBox(err.message || "Failed to load login users", "error");
        }
    }

    async function loadForEdit() {
        if (!profileId) return;
        const row = await request(`/users/profiles/${profileId}`, "GET");
        setForm(row || {});
        if (els.title) els.title.textContent = "Edit Profile";
    }

    async function save() {
        const canAdd = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "add");
        const canEdit = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "edit");
        if (profileId && !canEdit) {
            alert("No edit permission.");
            return;
        }
        if (!profileId && !canAdd) {
            alert("No add permission.");
            return;
        }

        const payload = getPayload();
        if (!payload.profile_name) {
            alert("Name is required.");
            return;
        }
        try {
            await ensurePicturePayloadReady();
            const finalPayload = getPayload();
            if (profileId) {
                await request(`/users/profiles/${profileId}`, "PUT", finalPayload);
                showMessageBox("Profile updated");
            } else {
                await request("/users/profiles", "POST", finalPayload);
                showMessageBox("Profile saved");
            }
            window.location.href = "profile-list.html";
        } catch (err) {
            alert(err.message || "Failed to save profile.");
        }
    }

    async function removeProfile() {
        const canDelete = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "delete");
        if (!profileId) {
            alert("Delete is available only in edit mode.");
            return;
        }
        if (!canDelete) {
            alert("No delete permission.");
            return;
        }
        if (!confirm("Delete this profile?")) return;
        try {
            await request(`/users/profiles/${profileId}`, "DELETE");
            showMessageBox("Profile deleted");
            window.location.href = "profile-list.html";
        } catch (err) {
            alert(err.message || "Failed to delete profile.");
        }
    }

    function bindEvents() {
        els.company_code.addEventListener("input", () => {
            els.company_code.value = normalizeUpper(els.company_code.value);
        });
        els.login_user.addEventListener("change", () => {
            autofillFromSelectedUser();
        });
        els.save.addEventListener("click", save);
        if (els.del) {
            els.del.addEventListener("click", removeProfile);
        }
        els.picture.addEventListener("change", () => {
            const file = els.picture.files && els.picture.files[0];
            if (!file) return;
            pictureName = String(file.name || "profile");
            const reader = new FileReader();
            reader.onload = () => {
                pictureBase64 = String(reader.result || "");
                if (pictureBase64) {
                    els.avatar.src = pictureBase64;
                }
            };
            reader.readAsDataURL(file);
        });
        els.avatar.addEventListener("error", () => {
            els.avatar.src = DEFAULT_AVATAR_PLACEHOLDER;
        });
    }

    async function init() {
        if (typeof window.__waitForUserAccessPermissions === "function") {
            await window.__waitForUserAccessPermissions();
        }
        bindEvents();
        await loadProfileUsers();
        if (!String(els.company_code.value || "").trim()) {
            const mappedCode = String(localStorage.getItem("mappedCompanyCode") || "").trim();
            if (mappedCode) els.company_code.value = normalizeUpper(mappedCode);
        }
        await loadForEdit();
        const canDelete = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "delete");
        if (els.del) {
            els.del.style.display = profileId && canDelete ? "" : "none";
        }
    }

    init();
})();
