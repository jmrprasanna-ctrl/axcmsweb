(function () {
    const PROFILE_PATH = "/users/profile-list.html";
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
        if (data.profile_picture_url) {
            els.avatar.src = `${apiOrigin()}${String(data.profile_picture_url)}`;
        }
    }

    function getSelectedProfileUser() {
        const selectedId = Number(els.login_user.value || 0);
        if (!selectedId) return null;
        return profileUsers.find((u) => Number(u.id || 0) === selectedId) || null;
    }

    function autofillFromSelectedUser() {
        const selected = getSelectedProfileUser();
        if (!selected) return;
        if (selected.email) els.email.value = String(selected.email);
        if (selected.username && !String(els.profile_name.value || "").trim()) {
            els.profile_name.value = String(selected.username);
        }
        if (selected.company) els.company_name.value = String(selected.company);
        if (selected.company_code) els.company_code.value = normalizeUpper(selected.company_code);
        if (selected.department) els.department.value = String(selected.department);
        if (selected.telephone) els.telephone.value = String(selected.telephone);
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
            profile_picture_base64: pictureBase64 || undefined,
            profile_picture_name: pictureName || undefined,
        };
    }

    async function fillFromEmail() {
        const email = String(els.email.value || "").trim().toLowerCase();
        if (!email) return;
        const matched = profileUsers.find((u) => String(u.email || "").trim().toLowerCase() === email);
        if (matched) {
            els.login_user.value = String(Number(matched.id || 0));
            autofillFromSelectedUser();
            return;
        }
        try {
            const res = await request(`/users/profiles/user-by-email?email=${encodeURIComponent(email)}`, "GET");
            const user = res && res.user ? res.user : null;
            if (!user) return;
            const byName = profileUsers.find((u) => String(u.username || "").trim().toLowerCase() === String(user.username || "").trim().toLowerCase());
            if (byName && Number(byName.id || 0)) {
                els.login_user.value = String(Number(byName.id || 0));
            }
            if (!String(els.company_name.value || "").trim()) els.company_name.value = String(user.company || "");
            if (!String(els.department.value || "").trim()) els.department.value = String(user.department || "");
            if (!String(els.telephone.value || "").trim()) els.telephone.value = String(user.telephone || "");
            if (!String(els.profile_name.value || "").trim()) els.profile_name.value = String(user.username || "");
            if (!String(els.company_code.value || "").trim()) {
                const mappedCode = String(localStorage.getItem("mappedCompanyCode") || "").trim();
                if (mappedCode) els.company_code.value = normalizeUpper(mappedCode);
            }
        } catch (_err) {
        }
    }

    async function loadProfileUsers() {
        const res = await request("/users/profiles/user-options", "GET");
        const list = Array.isArray(res?.users) ? res.users : [];
        profileUsers = list;
        els.login_user.innerHTML = `<option value="">Select Login User</option>`;
        list.forEach((u) => {
            const id = Number(u.id || 0);
            if (!id) return;
            const opt = document.createElement("option");
            opt.value = String(id);
            opt.textContent = String(u.label || u.username || `User ${id}`);
            els.login_user.appendChild(opt);
        });
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
        if (!payload.profile_name || !payload.email) {
            alert("Name and email are required.");
            return;
        }
        try {
            if (profileId) {
                await request(`/users/profiles/${profileId}`, "PUT", payload);
                showMessageBox("Profile updated");
            } else {
                await request("/users/profiles", "POST", payload);
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
        els.email.addEventListener("blur", fillFromEmail);
        els.login_user.addEventListener("change", autofillFromSelectedUser);
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
