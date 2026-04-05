const judgmentSearchEl = document.getElementById("judgmentSearch");
const judgmentsTableBodyEl = document.querySelector("#judgmentsTable tbody");
let allJudgments = [];

function normalizeUploadsCount(row) {
    if (Array.isArray(row.uploads_json)) return row.uploads_json.length;
    return 0;
}

function renderFinishedText(row) {
    return Boolean(row?.finished) ? "Finished" : "";
}

function renderJudgments(rows) {
    if (!judgmentsTableBodyEl) return;
    judgmentsTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            window.location.href = `edit-judgment.html?id=${row.id}`;
        });
        tr.innerHTML = `
            <td>${row.judgment_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${renderFinishedText(row)}</td>
        `;
        judgmentsTableBodyEl.appendChild(tr);
    });
}

function applyJudgmentFilter() {
    const q = String(judgmentSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderJudgments(allJudgments);
        return;
    }
    const filtered = allJudgments.filter((row) =>
        [row.case_no, row.customer_name, row.court, row.attend_lawyer, row.judgment_text]
            .some((x) => String(x || "").toLowerCase().includes(q))
    );
    renderJudgments(filtered);
}

async function loadJudgments() {
    try {
        allJudgments = await request("/judgments", "GET");
        applyJudgmentFilter();
    } catch (err) {
        alert(err.message || "Failed to load dugement records.");
    }
}

if (judgmentSearchEl) {
    judgmentSearchEl.addEventListener("input", applyJudgmentFilter);
}

loadJudgments();
