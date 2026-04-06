function textValue(v) {
    const clean = String(v == null ? "" : v).trim();
    return clean || "-";
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = textValue(value);
}

function resolveAvatarUrl(profile) {
    const raw = String(
        profile?.profile_picture_data_url
        || profile?.profile_picture_url
        || profile?.profile_picture_api_url
        || ""
    ).trim();
    if (!raw) return "../../assets/images/profile-placeholder.svg";
    if (/^data:image\//i.test(raw)) return raw;
    if (/^https?:\/\//i.test(raw)) return raw;
    const apiOrigin = String(BASE_URL || "").replace(/\/api\/?$/i, "").replace(/\/+$/, "");
    return `${apiOrigin}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

function applyProfile(profile) {
    const view = profile || {};
    setText("profileViewName", view.profile_name);
    setText("profileViewLoginUser", view.login_user);
    setText("profileViewEmail", view.email);
    setText("profileViewLinkedEmail", view.linked_user_email);
    setText("profileViewCompanyName", view.company_name);
    setText("profileViewDepartment", view.department);
    setText("profileViewSection", view.section);
    setText("profileViewTelephone", view.telephone);
    setText("profileViewMobile", view.mobile);
    setText("profileViewAddress", view.address);

    const avatar = document.getElementById("profileViewAvatar");
    if (avatar) {
        avatar.src = resolveAvatarUrl(view);
        avatar.onerror = () => {
            avatar.src = "../../assets/images/profile-placeholder.svg";
        };
    }
}

async function loadProfileView() {
    try {
        const profile = await request("/users/profiles/me", "GET");
        applyProfile(profile || {});
    } catch (_err) {
        applyProfile({
            profile_name: localStorage.getItem("userProfileName") || localStorage.getItem("userName") || "User",
            linked_user_email: localStorage.getItem("userEmail") || "",
        });
        alert("Unable to load profile details.");
    }
}

loadProfileView();
