async function renderCaseHistory(caseNoValue, targetBodyId, activeEntry) {
    const tbody = document.getElementById(targetBodyId);
    if (!tbody) return;
    const key = String(caseNoValue || "").trim();
    if (!key) {
        tbody.innerHTML = '<tr><td colspan="4">No case history found.</td></tr>';
        return;
    }
    try {
        const rows = await request(`/cases?q=${encodeURIComponent(key)}`, "GET");
        const list = Array.isArray(rows) ? rows : [];
        tbody.innerHTML = "";
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="4">No case history found.</td></tr>';
            return;
        }
        list.forEach((row) => {
            const tr = document.createElement("tr");
            const stepLabel = row.case_status_label || row.case_step || "Step";
            const shortComment = String(row.comment || "").trim();
            const active = Number(activeEntry || 0) === Number(row.id || 0);
            if (active) tr.classList.add("history-active-row");
            tr.classList.add("history-row-clickable");
            tr.addEventListener("click", () => {
                const id = Number(row?.id || 0);
                if (id > 0) {
                    window.location.href = `edit-case.html?id=${id}`;
                }
            });
            tr.innerHTML = `
                <td>${row.case_date || ""}</td>
                <td>${stepLabel}</td>
                <td>${row.next_date || ""}</td>
                <td title="${shortComment.replace(/"/g, "&quot;")}">${shortComment.slice(0, 120)}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (_err) {
        tbody.innerHTML = '<tr><td colspan="4">Failed to load case history.</td></tr>';
    }
}
