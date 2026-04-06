const role = (localStorage.getItem("role") || "").toLowerCase();
const allowedPaths = (() => {
    try{
        const rows = JSON.parse(localStorage.getItem("userAllowedPathsRuntime") || "[]");
        return new Set((Array.isArray(rows) ? rows : []).map((x) => String(x || "").trim().toLowerCase()));
    }catch(_err){
        return new Set();
    }
})();
const canAccessFinance = (role === "admin" || role === "manager")
    ? true
    : (role === "user" && allowedPaths.has("/finance/finance.html"));
if(!canAccessFinance){
    alert("You don't have access to Finance.");
    window.location.href = "../dashboard.html";
}

function asNumber(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function fmt(v){
    return asNumber(v).toFixed(2);
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDateWithWeekday(dateText){
    const raw = String(dateText || "").trim();
    if(!raw) return "Today";
    const parsed = new Date(raw);
    if(Number.isNaN(parsed.getTime())) return raw;
    const weekday = parsed.toLocaleDateString("en-GB", { weekday: "long" });
    const date = parsed.toLocaleDateString("en-GB");
    return `${date} ${weekday}`;
}

let lastFinanceData = null;
let salesChartInstance = null;
let profitChartInstance = null;
let hasWarnedMissingChartJs = false;

function renderMonthlyCharts(summary){
    const salesCanvas = document.getElementById("salesChart");
    const profitCanvas = document.getElementById("profitChart");
    if(!salesCanvas || !profitCanvas){
        return;
    }
    if(typeof window.Chart !== "function"){
        if(!hasWarnedMissingChartJs){
            hasWarnedMissingChartJs = true;
            console.warn("Chart.js is unavailable. Finance charts skipped.");
        }
        return;
    }

    const labels = Array.isArray(summary?.months) && summary.months.length === 12
        ? summary.months
        : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlySales = Array.isArray(summary?.monthlySales) ? summary.monthlySales : Array(12).fill(0);
    const monthlyProfit = Array.isArray(summary?.monthlyProfit) ? summary.monthlyProfit : Array(12).fill(0);

    if(salesChartInstance){
        salesChartInstance.destroy();
    }
    salesChartInstance = new window.Chart(salesCanvas.getContext("2d"), {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "Sales", data: monthlySales, backgroundColor: "#3498db" }]
        }
    });

    if(profitChartInstance){
        profitChartInstance.destroy();
    }
    profitChartInstance = new window.Chart(profitCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels,
            datasets: [{ label: "Profit", data: monthlyProfit, borderColor: "#2980b9", fill: false }]
        }
    });
}

function putRows(tbodyId, rows, emptyCols){
    const tbody = document.getElementById(tbodyId);
    tbody.innerHTML = "";
    if(!rows || !rows.length){
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="${emptyCols}">No data found.</td>`;
        tbody.appendChild(tr);
        return;
    }
    rows.forEach((trHtml) => {
        const tr = document.createElement("tr");
        tr.innerHTML = trHtml;
        tbody.appendChild(tr);
    });
}

async function loadFinanceOverview(){
    try{
        const periodEl = document.getElementById("summaryPeriod");
        const dateEl = document.getElementById("summaryDate");
        const period = (periodEl ? periodEl.value : "day") || "day";
        const today = new Date().toISOString().slice(0, 10);
        const date = (dateEl && dateEl.value) ? dateEl.value : today;
        const query = `?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`;
        const [data, dashboardSummary, dashboardYearSummary] = await Promise.all([
            request(`/reports/finance-overview${query}`, "GET"),
            request(`/dashboard/summary?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`, "GET"),
            request(`/dashboard/summary?period=year&date=${encodeURIComponent(date)}`, "GET")
        ]);
        lastFinanceData = data;

        const salesValue = dashboardSummary.totalSalesPeriod ?? dashboardSummary.totalSales ?? 0;
        const receivedValue = dashboardSummary.receivedPaymentPeriod ?? dashboardSummary.receivedPayment ?? 0;
        const expenseValue = dashboardSummary.totalExpensesPeriod ?? dashboardSummary.totalExpenses ?? 0;
        const profitValue = dashboardSummary.netProfitPeriod ?? dashboardSummary.netProfit ?? 0;
        const salesEl = document.getElementById("financeTotalSales");
        const receivedEl = document.getElementById("financeReceivedPayment");
        const expenseEl = document.getElementById("financeTotalExpense");
        const profitEl = document.getElementById("financeNetProfit");
        if(salesEl) salesEl.innerText = fmt(salesValue);
        if(receivedEl) receivedEl.innerText = fmt(receivedValue);
        if(expenseEl) expenseEl.innerText = fmt(expenseValue);
        if(profitEl) profitEl.innerText = fmt(profitValue);
        renderMonthlyCharts(dashboardYearSummary || dashboardSummary);
        const labelEl = document.getElementById("summaryRangeLabel");
        if(labelEl){
            const periodName = String(period || "day").toLowerCase();
            if(periodName === "year"){
                labelEl.innerText = date ? `Year: ${date.slice(0,4)}` : "This Year";
            }else if(periodName === "month"){
                labelEl.innerText = date ? `Month of ${date.slice(0,7)}` : "This Month";
            }else{
                labelEl.innerText = formatDateWithWeekday(date);
            }
        }

        const summaryRows = ["week","month","year"].map((k) => {
            const s = data.summary_by_period?.[k] || {};
            return `
                <td>${s.period || k}</td>
                <td>${fmt(s.total_sales)}</td>
                <td>${fmt(s.total_expenses)}</td>
                <td>${fmt(s.net_profit)}</td>
            `;
        });
        putRows("summaryBody", summaryRows, 4);

    }catch(err){
        putRows("summaryBody", [`<td colspan="4">${err.message || "Failed to load finance overview"}</td>`], 4);
    }
}

function populateSummaryYearOptions(){
    const yearEl = document.getElementById("summaryYearSelect");
    if(!yearEl) return;
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 15;
    const rows = [];
    for(let y = currentYear; y >= startYear; y--){
        rows.push(`<option value="${y}">${y}</option>`);
    }
    yearEl.innerHTML = rows.join("");
}

function populateSummaryMonthOptions(){
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!monthEl) return;
    monthEl.innerHTML = MONTH_NAMES
        .map((name, i) => `<option value="${String(i + 1).padStart(2, "0")}">${name}</option>`)
        .join("");
}

function syncSummaryDateFromSelectors(){
    const periodEl = document.getElementById("summaryPeriod");
    const dateEl = document.getElementById("summaryDate");
    const yearEl = document.getElementById("summaryYearSelect");
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!periodEl || !dateEl) return;

    const now = new Date();
    const period = (periodEl.value || "day").toLowerCase();
    const year = (yearEl && yearEl.value) ? yearEl.value : String(now.getFullYear());
    const month = (monthEl && monthEl.value) ? monthEl.value : String(now.getMonth() + 1).padStart(2, "0");

    if(period === "year"){
        dateEl.value = `${year}-01-01`;
    }else if(period === "month"){
        dateEl.value = `${year}-${month}-01`;
    }else if(!dateEl.value){
        dateEl.value = now.toISOString().slice(0, 10);
    }
}

function toggleSummaryExtraSelectors(){
    const periodEl = document.getElementById("summaryPeriod");
    const dateEl = document.getElementById("summaryDate");
    const yearEl = document.getElementById("summaryYearSelect");
    const monthEl = document.getElementById("summaryMonthSelect");
    if(!periodEl || !dateEl || !yearEl || !monthEl) return;

    const period = (periodEl.value || "day").toLowerCase();
    yearEl.style.display = (period === "year" || period === "month") ? "" : "none";
    monthEl.style.display = period === "month" ? "" : "none";
    dateEl.style.display = period === "day" ? "" : "none";
}

function csvEscape(value){
    const text = String(value ?? "");
    if(text.includes(",") || text.includes("\"") || text.includes("\n")){
        return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
}

function downloadFile(name, content, type){
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function exportFinanceExcel(){
    if(!lastFinanceData){
        alert("Load finance data first.");
        return;
    }
    const lines = [];
    lines.push("Summary By Period");
    lines.push("Period,Total Sales,Total Expenses,Net Profit");
    ["week","month","year"].forEach((k) => {
        const s = lastFinanceData.summary_by_period?.[k] || {};
        lines.push([s.period || k, fmt(s.total_sales), fmt(s.total_expenses), fmt(s.net_profit)].map(csvEscape).join(","));
    });

    downloadFile("Finance_Overview.csv", lines.join("\n"), "text/csv;charset=utf-8;");
}

function exportFinancePDF(){
    if(!lastFinanceData){
        alert("Load finance data first.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "a4" });
    let y = 12;
    const line = (text) => {
        if(y > 285){
            doc.addPage();
            y = 12;
        }
        doc.text(String(text), 10, y);
        y += 6;
    };

    line("Finance Overview");
    line("");
    line("Summary By Period");
    ["week","month","year"].forEach((k) => {
        const s = lastFinanceData.summary_by_period?.[k] || {};
        line(`${s.period || k}: Sales ${fmt(s.total_sales)} | Expenses ${fmt(s.total_expenses)} | Net ${fmt(s.net_profit)}`);
    });
    doc.save("Finance_Overview.pdf");
}

function exportSummaryPDF(){
    exportTablePDF("summaryTable", "Total Sales / Expenses / Net Profit", "Finance_Summary_By_Period.pdf");
}
function exportSummaryXlsx(){
    exportTableXlsx("summaryTable", "Finance_Summary_By_Period.xlsx");
}

function exportTablePDF(tableId, title, fileName){
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: "a4" });
    doc.setFontSize(12);
    doc.text(title, 14, 20);
    const endY = writeTableToDoc(doc, "", tableId, 28);
    if(endY === -1){
        alert("No data to export. Please click Refresh first.");
        return;
    }
    doc.save(fileName);
}

function getTableRowsAsCsvLines(tableId){
    const table = document.getElementById(tableId);
    if(!table) return [];
    const rows = Array.from(table.querySelectorAll("tr"));
    return rows.map((row) => {
        const cells = Array.from(row.children).map((cell) => csvEscape(cell.innerText.trim()));
        return cells.join(",");
    });
}

function exportTableXlsx(tableId, fileName){
    const lines = getTableRowsAsCsvLines(tableId);
    if(!lines.length){
        alert("No data to export. Please click Refresh first.");
        return;
    }
    downloadFile(
        fileName,
        lines.join("\n"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;"
    );
}

function exportMultiTableXlsx(sections, fileName){
    const lines = [];
    sections.forEach((section, index) => {
        const rows = getTableRowsAsCsvLines(section.tableId);
        if(!rows.length) return;
        if(index > 0 && lines.length){
            lines.push("");
        }
        lines.push(csvEscape(section.title || ""));
        lines.push(...rows);
    });
    if(!lines.length){
        alert("No data to export. Please click Refresh first.");
        return;
    }
    downloadFile(
        fileName,
        lines.join("\n"),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8;"
    );
}

function writeTableToDoc(doc, sectionTitle, tableId, startY){
    const rows = document.querySelectorAll(`#${tableId} tbody tr`);
    if(!rows.length){
        return -1;
    }

    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - 28;
    let y = startY;

    if(sectionTitle){
        doc.setFontSize(11);
        doc.text(sectionTitle, 14, y);
        y += 8;
    }

    doc.setFontSize(9);
    rows.forEach((row) => {
        const cells = Array.from(row.children).map((td) => td.innerText.trim());
        const line = cells.join(" | ");
        const wrapped = doc.splitTextToSize(line, maxWidth);
        const nextY = y + (wrapped.length * 5);
        if(nextY > pageHeight - 10){
            doc.addPage();
            y = 15;
        }
        doc.text(wrapped, 14, y);
        y += (wrapped.length * 5) + 3;
    });

    return y;
}

function logout(){
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href="../login.html";
}

const summaryDateEl = document.getElementById("summaryDate");
if(summaryDateEl){
    summaryDateEl.value = new Date().toISOString().slice(0, 10);
}
const summaryPeriodEl = document.getElementById("summaryPeriod");
const summaryYearEl = document.getElementById("summaryYearSelect");
const summaryMonthEl = document.getElementById("summaryMonthSelect");

populateSummaryYearOptions();
populateSummaryMonthOptions();
if(summaryYearEl && !summaryYearEl.value){
    summaryYearEl.value = String(new Date().getFullYear());
}
if(summaryMonthEl && !summaryMonthEl.value){
    summaryMonthEl.value = String(new Date().getMonth() + 1).padStart(2, "0");
}
toggleSummaryExtraSelectors();
syncSummaryDateFromSelectors();

if(summaryPeriodEl){
    summaryPeriodEl.addEventListener("change", () => {
        toggleSummaryExtraSelectors();
        syncSummaryDateFromSelectors();
        loadFinanceOverview();
    });
}
if(summaryYearEl){
    summaryYearEl.addEventListener("change", () => {
        syncSummaryDateFromSelectors();
        loadFinanceOverview();
    });
}
if(summaryMonthEl){
    summaryMonthEl.addEventListener("change", () => {
        syncSummaryDateFromSelectors();
        loadFinanceOverview();
    });
}
if(summaryDateEl){
    summaryDateEl.addEventListener("change", () => {
        const period = summaryPeriodEl ? (summaryPeriodEl.value || "day").toLowerCase() : "day";
        if(period !== "day") return;
        loadFinanceOverview();
    });
}

loadFinanceOverview();


