const answerSearchEl = document.getElementById("answerSearch");
const answerTableBodyEl = document.querySelector("#answersTable tbody");
let allAnswers = [];

function normalizeUploadsCount(row) {
    if (Array.isArray(row.uploads_json)) return row.uploads_json.length;
    return 0;
}

function renderWitnessActionCell(row) {
    if (row && row.witness_created) {
        return `<a class="btn btn-secondary btn-inline is-disabled" href="#" aria-disabled="true" title="List of witnesses already created" onclick="event.preventDefault(); event.stopPropagation(); return false;">L/witnesses</a>`;
    }
    return `<a class="btn btn-secondary btn-inline" href="witness-create.html?answer_id=${row.id || ""}&case_id=${row.case_id || ""}" onclick="event.stopPropagation()">L/witnesses</a>`;
}

function renderAnswers(rows) {
    if (!answerTableBodyEl) return;
    answerTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            window.location.href = `edit-answer.html?id=${row.id}`;
        });
        tr.innerHTML = `
            <td>${row.answer_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${row.witness_created ? "&#10003;" : ""}</td>
            <td>${renderWitnessActionCell(row)}</td>
        `;
        answerTableBodyEl.appendChild(tr);
    });
}

function applyAnswerFilter() {
    const q = String(answerSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderAnswers(allAnswers);
        return;
    }
    const filtered = allAnswers.filter((row) =>
        [row.case_no, row.customer_name, row.court, row.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q))
    );
    renderAnswers(filtered);
}

async function loadAnswers() {
    try {
        const rows = await request("/answers", "GET");
        allAnswers = Array.isArray(rows) ? rows : [];
        applyAnswerFilter();
    } catch (err) {
        alert(err.message || "Failed to load answer records.");
    }
}

if (answerSearchEl) {
    answerSearchEl.addEventListener("input", applyAnswerFilter);
}

loadAnswers();
