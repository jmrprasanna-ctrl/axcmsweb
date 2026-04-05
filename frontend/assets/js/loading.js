(function () {
  function safeNextPath(value) {
    const raw = String(value || "").trim();
    if (!raw) return "login.html";
    if (raw.includes("://")) return "login.html";
    if (raw.includes("..")) return "login.html";
    if (raw.startsWith("/")) return "login.html";
    return raw;
  }

  try {
    if (localStorage.getItem("token")) {
      window.location.replace("dashboard.html");
      return;
    }
  } catch (_err) {
  }

  const params = new URLSearchParams(window.location.search || "");
  const next = safeNextPath(params.get("next"));

  window.setTimeout(function () {
    window.location.replace(next);
  }, 2200);
})();
