const witnessSearchEl = document.getElementById("witnessSearch");
const witnessesTableBodyEl = document.querySelector("#witnessesTable tbody");
let allWitnesses = [];

function normalizeUploadsCount(row) {
    const nested = row?.Answer?.uploads_json || row?.answer?.uploads_json;
    return Array.isArray(nested) ? nested.length : 0;
}

function renderJudgmentActionCell(row) {
    if (row && row.judgment_created) {
        return `<a class="btn btn-secondary btn-inline is-disabled" href="#" aria-disabled="true" title="Dudgment already created" onclick="event.preventDefault(); event.stopPropagation(); return false;">Dudgment</a>`;
    }
    return `<a class="btn btn-secondary btn-inline" href="judgment-create.html?case_id=${row.case_id || ""}" onclick="event.stopPropagation()">Dudgment</a>`;
}

function renderWitnesses(rows) {
    if (!witnessesTableBodyEl) return;
    witnessesTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            window.location.href = `edit-witness.html?id=${row.id}`;
        });
        tr.innerHTML = `
            <td>${row.witness_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${row.judgment_created ? "&#10003;" : ""}</td>
            <td>${renderJudgmentActionCell(row)}</td>
        `;
        witnessesTableBodyEl.appendChild(tr);
    });
}

function applyWitnessFilter() {
    const q = String(witnessSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderWitnesses(allWitnesses);
        return;
    }
    const filtered = allWitnesses.filter((row) =>
        [row.case_no, row.customer_name, row.court, row.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q))
    );
    renderWitnesses(filtered);
}

async function loadWitnesses() {
    try {
        allWitnesses = await request("/witnesses", "GET");
        applyWitnessFilter();
    } catch (err) {
        alert(err.message || "Failed to load witness records.");
    }
}

if (witnessSearchEl) {
    witnessSearchEl.addEventListener("input", applyWitnessFilter);
}

loadWitnesses();
