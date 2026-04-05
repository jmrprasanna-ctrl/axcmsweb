const caseSearchEl = document.getElementById("caseSearch");
const casesTableBodyEl = document.querySelector("#casesTable tbody");
const newCaseBtnEl = document.getElementById("newCaseBtn");
let allCases = [];

function normalizeStep(value) {
    return String(value || "").trim().toUpperCase();
}

function resolveOpenUrl(row) {
    const statusStep = normalizeStep(row?.case_status_step || row?.case_step);
    const plaintId = Number(row?.latest_plaint_id || 0);
    const answerId = Number(row?.latest_answer_id || 0);
    const witnessId = Number(row?.latest_witness_id || 0);
    const judgmentId = Number(row?.latest_judgment_id || 0);

    if (statusStep === "PLAINT_STEP" && plaintId > 0) {
        return `edit-plaint.html?id=${plaintId}`;
    }
    if (statusStep === "ANSWER_STEP" && answerId > 0) {
        return `edit-answer.html?id=${answerId}`;
    }
    if (statusStep === "LW_STEP" && witnessId > 0) {
        return `edit-witness.html?id=${witnessId}`;
    }
    if (statusStep === "DUDGMENT_STEP" && judgmentId > 0) {
        return `edit-judgment.html?id=${judgmentId}`;
    }

    const selectedCaseNo = String(row?.case_no || "").trim().toUpperCase();
    const selectedStep = normalizeStep(row?.case_step);
    const latestForSelection = allCases.find((item) => {
        const caseNo = String(item?.case_no || "").trim().toUpperCase();
        const step = normalizeStep(item?.case_step);
        return caseNo === selectedCaseNo && step === selectedStep && Boolean(item?.latest_case_no_entry);
    });
    const openId = Number(latestForSelection?.id || row?.id || 0);
    if (openId > 0) {
        return `edit-case.html?id=${openId}`;
    }
    return null;
}

function normalizeUploadsCount(row) {
    if (Array.isArray(row.uploads_json)) return row.uploads_json.length;
    return 0;
}

function renderCases(rows) {
    casesTableBodyEl.innerHTML = "";
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            const url = resolveOpenUrl(row);
            if (!url) return;
            window.location.href = url;
        });
        tr.innerHTML = `
            <td>${row.case_date || ""}</td>
            <td>${row.case_no || ""}</td>
            <td>${row.customer_name || ""}</td>
            <td>${row.court || ""}</td>
            <td>${row.attend_lawyer || ""}</td>
            <td>${normalizeUploadsCount(row)}</td>
            <td>${row.case_status_label || "Step"}</td>
        `;
        casesTableBodyEl.appendChild(tr);
    });
}

function applyFilter() {
    const q = String(caseSearchEl?.value || "").trim().toLowerCase();
    if (!q) {
        renderCases(allCases);
        return;
    }
    const filtered = allCases.filter((row) => {
        return [row.case_no, row.customer_name, row.court, row.attend_lawyer]
            .some((x) => String(x || "").toLowerCase().includes(q));
    });
    renderCases(filtered);
}

async function loadCases() {
    try {
        allCases = await request("/cases?step=STEP", "GET");
        applyFilter();
    } catch (err) {
        alert(err.message || "Failed to load cases.");
    }
}

if (caseSearchEl) {
    caseSearchEl.addEventListener("input", applyFilter);
}
if (newCaseBtnEl) {
    newCaseBtnEl.addEventListener("click", () => {
        window.location.href = "new-case.html";
    });
}

loadCases();


