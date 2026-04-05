const plaintSearchEl = document.getElementById("plaintSearch");
const plaintTableBodyEl = document.querySelector("#plaintsTable tbody");
let allPlaints = [];

function normalizeUploadsCount(row) {
    if (Array.isArray(row.uploads_json)) return row.uploads_json.length;
    return 0;
}

function renderPlaints(rows) {
    if (!plaintTableBodyEl) return;
    plaintTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            window.location.href = `edit-plaint.html?id=${row.id}`;
        });
        tr.innerHTML = `
            <td>${row.plaint_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${row.answer_created ? "&#10003;" : ""}</td>
        `;
        plaintTableBodyEl.appendChild(tr);
    });
}

function applyPlaintFilter() {
    const q = String(plaintSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderPlaints(allPlaints);
        return;
    }
    const filtered = allPlaints.filter((row) =>
        [row.case_no, row.customer_name, row.court, row.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q))
    );
    renderPlaints(filtered);
}

async function loadPlaints() {
    try {
        const rows = await request("/plaints", "GET");
        allPlaints = Array.isArray(rows) ? rows : [];
        applyPlaintFilter();
    } catch (err) {
        alert(err.message || "Failed to load plaint records.");
    }
}

if (plaintSearchEl) {
    plaintSearchEl.addEventListener("input", applyPlaintFilter);
}

loadPlaints();
