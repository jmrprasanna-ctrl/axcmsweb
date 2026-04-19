const caseSearchEl = document.getElementById("caseSearch");
const casesTableBodyEl = document.querySelector("#casesTable tbody");

let allCases = [];

function normalizeUploadsCount(row) {
    if (Number.isFinite(Number(row?.uploads_count))) {
        return Number(row.uploads_count);
    }
    if (Array.isArray(row?.uploads_json)) {
        return row.uploads_json.length;
    }
    return 0;
}

function statusClass(label) {
    const key = String(label || "").trim().toLowerCase();
    if (key === "plaint") return "status-plaint";
    if (key === "answer") return "status-answer";
    if (key === "l/witnesses") return "status-witness";
    if (key === "dudgment") return "status-judgment";
    if (key === "finished") return "status-finished";
    return "status-step";
}

function createActionButton(row) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-mini-btn table-icon-btn";
    button.title = "Open";
    button.setAttribute("aria-label", "Open");
    button.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
            <path d="M10 6H7a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
    `;
    button.addEventListener("click", (event) => {
        event.stopPropagation();
        const caseNo = String(row?.case_no || "").trim();
        if (!caseNo) return;
        window.location.href = `../drawyer/drawyer.html?case_no=${encodeURIComponent(caseNo)}`;
    });
    return button;
}

function buildDisplayRows(rows) {
    const withOverallFlag = (Array.isArray(rows) ? rows : []).filter((row) => {
        if (row?.latest_case_no_overall_entry === true) return true;
        if (row?.latest_case_no_overall_entry === false) return false;
        return true;
    });
    if (withOverallFlag.length && withOverallFlag.length !== (Array.isArray(rows) ? rows : []).length) {
        return withOverallFlag.filter((row) => String(row?.case_step || "").trim().toUpperCase() !== "FINISHED");
    }

    const pickedByCaseNo = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const caseNo = String(row?.case_no || "").trim();
        if (!caseNo) return;
        if (String(row?.case_step || "").trim().toUpperCase() === "FINISHED") {
            return;
        }
        if (!pickedByCaseNo.has(caseNo)) {
            pickedByCaseNo.set(caseNo, row);
        }
    });
    return Array.from(pickedByCaseNo.values());
}

function renderCases(rows) {
    if (!casesTableBodyEl) return;
    casesTableBodyEl.innerHTML = "";

    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.classList.add("customer-row-clickable");
        tr.addEventListener("click", () => {
            const id = Number(row?.id || 0);
            if (id > 0) {
                window.location.href = `edit-case.html?id=${id}`;
            }
        });

        const statusLabel = String(row?.case_status_label || "Step").trim() || "Step";
        const uploads = normalizeUploadsCount(row);

        const dateTd = document.createElement("td");
        dateTd.textContent = String(row?.case_date || "");
        tr.appendChild(dateTd);

        const caseNoTd = document.createElement("td");
        caseNoTd.textContent = String(row?.case_no || "");
        tr.appendChild(caseNoTd);

        const customerTd = document.createElement("td");
        customerTd.textContent = String(row?.customer_name || "");
        tr.appendChild(customerTd);

        const courtTd = document.createElement("td");
        courtTd.textContent = String(row?.court || "");
        tr.appendChild(courtTd);

        const lawyerTd = document.createElement("td");
        lawyerTd.textContent = String(row?.attend_lawyer || "");
        tr.appendChild(lawyerTd);

        const statusTd = document.createElement("td");
        const badge = document.createElement("span");
        badge.className = `case-status-badge ${statusClass(statusLabel)}`;
        badge.textContent = statusLabel;
        statusTd.appendChild(badge);
        tr.appendChild(statusTd);

        const uploadsTd = document.createElement("td");
        uploadsTd.textContent = String(uploads);
        tr.appendChild(uploadsTd);

        const filesTd = document.createElement("td");
        filesTd.appendChild(createActionButton(row));
        tr.appendChild(filesTd);

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
        return [row.case_no, row.customer_name, row.court, row.attend_lawyer, row.case_status_label]
            .some((x) => String(x || "").toLowerCase().includes(q));
    });

    renderCases(filtered);
}

async function loadCases() {
    try {
        const rows = await request("/cases", "GET");
        allCases = buildDisplayRows(rows);
        applyFilter();
    } catch (err) {
        alert(err.message || "Failed to load cases.");
    }
}

if (caseSearchEl) {
    caseSearchEl.addEventListener("input", applyFilter);
}

loadCases();

