(function () {
    const PROFILE_PATH = "/users/profile-list.html";
    const DEFAULT_AVATAR_PLACEHOLDER = "../../assets/images/profile-placeholder.svg";
    const tableBody = document.getElementById("profileTableBody");
    const addBtn = document.getElementById("addProfileBtn");

    function esc(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function resolveProfileAvatarUrl(rawUrl) {
        const fallback = DEFAULT_AVATAR_PLACEHOLDER;
        const value = String(rawUrl || "").trim();
        if (!value) return fallback;
        if (/^data:image\//i.test(value)) return value;
        if (/^https?:\/\//i.test(value)) return value;
        const apiOrigin = String(BASE_URL || "").replace(/\/api\/?$/i, "");
        try {
            const normalizedPath = value.startsWith("/") ? value : `/${value}`;
            return new URL(normalizedPath, `${apiOrigin}/`).toString();
        } catch (_err) {
            return fallback;
        }
    }

    async function loadProfiles() {
        try {
            const rows = await request("/users/profiles", "GET");
            const list = Array.isArray(rows) ? rows : [];
            if (!list.length) {
                tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#6f839a;">No profiles found</td></tr>`;
                return;
            }
            const canEdit = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "edit");
            tableBody.innerHTML = list.map((p) => {
                const avatar = resolveProfileAvatarUrl(p.profile_picture_data_url || p.profile_picture_url || p.profile_picture_api_url);
                const profileId = Number(p.id || 0);
                return `
                    <tr data-open-id="${profileId}" ${canEdit && profileId ? `style="cursor:pointer;"` : ""}>
                        <td>
                            <div class="profile-title-col">
                                <img class="profile-table-avatar" src="${esc(avatar)}" alt="Profile">
                                <span>${esc(p.profile_name)}</span>
                            </div>
                        </td>
                        <td>${esc(p.email)}</td>
                        <td>${esc(p.login_user)}</td>
                        <td>${esc(p.company_name)}</td>
                        <td>${esc(p.department)}</td>
                        <td>${esc(p.mobile || p.telephone)}</td>
                    </tr>
                `;
            }).join("");
            tableBody.querySelectorAll("tr[data-open-id]").forEach((rowEl) => {
                rowEl.addEventListener("click", (ev) => {
                    const id = Number(rowEl.getAttribute("data-open-id") || 0);
                    if (!canEdit || !id) return;
                    window.location.href = `add-profile.html?id=${id}`;
                });
            });
            tableBody.querySelectorAll(".profile-table-avatar").forEach((imgEl) => {
                imgEl.addEventListener("error", () => {
                    imgEl.src = DEFAULT_AVATAR_PLACEHOLDER;
                }, { once: true });
            });
        } catch (err) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#b33;">${esc(err.message || "Failed to load profiles.")}</td></tr>`;
        }
    }

    async function init() {
        if (typeof window.__waitForUserAccessPermissions === "function") {
            await window.__waitForUserAccessPermissions();
        }
        const canAdd = typeof hasUserActionPermission === "function" && hasUserActionPermission(PROFILE_PATH, "add");
        if (addBtn) {
            addBtn.style.display = canAdd ? "" : "none";
            addBtn.addEventListener("click", () => {
                window.location.href = "add-profile.html";
            });
        }
        await loadProfiles();
    }

    init();
})();
