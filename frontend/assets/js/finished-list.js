const finishedSearchEl = document.getElementById("finishedSearch");
const finishedTableBodyEl = document.querySelector("#finishedCasesTable tbody");
let allFinishedCases = [];

function normalizeUploadsCount(row) {
    if (Array.isArray(row.uploads_json)) return row.uploads_json.length;
    return 0;
}

function renderFinished(rows) {
    if (!finishedTableBodyEl) return;
    finishedTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            const id = Number(row?.id || 0);
            if (id > 0) {
                window.location.href = `edit-case.html?id=${id}`;
            }
        });
        tr.innerHTML = `
            <td>${row.case_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${row.case_status_label || "Finished"}</td>
        `;
        finishedTableBodyEl.appendChild(tr);
    });
}

function applyFinishedFilter() {
    const q = String(finishedSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderFinished(allFinishedCases);
        return;
    }
    const filtered = allFinishedCases.filter((row) =>
        [row.case_no, row.customer_name, row.court, row.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q))
    );
    renderFinished(filtered);
}

async function loadFinished() {
    try {
        const rows = await request("/cases?step=FINISHED", "GET");
        allFinishedCases = (Array.isArray(rows) ? rows : []).filter((row) => row?.latest_case_no_entry);
        applyFinishedFilter();
    } catch (err) {
        alert(err.message || "Failed to load finished cases.");
    }
}

if (finishedSearchEl) {
    finishedSearchEl.addEventListener("input", applyFinishedFilter);
}

loadFinished();
