const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TODO_DOT_COLORS = ["#f5c000", "#1e88e5", "#ef5f70", "#4cc3a7", "#9b6ef3"];
const CASE_DOT_COLOR = "#7a4cc9";

let currentMonthDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = new Date();
let todos = [];
let caseRows = [];
let todosByDate = new Map();
let casesByDate = new Map();

function toDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeTodoDate(todo) {
    const key = String(todo?.todo_date || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
        return parseDate(`${key}T00:00:00`);
    }
    const base = parseDate(todo?.createdAt) || parseDate(todo?.updatedAt) || new Date();
    return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

function formatMonthLabel(dateObj) {
    return `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

function formatSelectedHeader(dateObj) {
    const today = new Date();
    const sameToday = toDateKey(today) === toDateKey(dateObj);
    if (sameToday) {
        return `TODAY ${dateObj.getDate()}`;
    }
    return `${WEEKDAY_NAMES[dateObj.getDay()].toUpperCase()} ${dateObj.getDate()}`;
}

function formatTodoTime(todo) {
    const dateObj = parseDate(todo?.createdAt) || parseDate(todo?.updatedAt);
    if (!dateObj) return "--:--";
    const hh = String(dateObj.getHours()).padStart(2, "0");
    const mm = String(dateObj.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
}

function buildTodosByDateIndex() {
    const map = new Map();
    todos.forEach((todo) => {
        const d = normalizeTodoDate(todo);
        if (!d) return;
        const key = toDateKey(d);
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(todo);
    });
    map.forEach((rows) => {
        rows.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    });
    todosByDate = map;
}

function buildCasesByDateIndex() {
    const map = new Map();
    caseRows.forEach((row) => {
        const key = String(row?.case_date || "").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        if (!map.has(key)) {
            map.set(key, []);
        }
        map.get(key).push(row);
    });
    map.forEach((rows) => {
        rows.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    });
    casesByDate = map;
}

function normalizeCaseDate(row) {
    const key = String(row?.case_date || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
    const d = parseDate(row?.createdAt || row?.updatedAt || "");
    if (!d) return "";
    return toDateKey(d);
}

function monthRangeYmd(dateObj) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { start: toDateKey(first), end: toDateKey(last) };
}

function getDayDotHtml(dateObj) {
    const key = toDateKey(dateObj);
    const todoRows = todosByDate.get(key) || [];
    const caseDayRows = casesByDate.get(key) || [];
    if (!todoRows.length && !caseDayRows.length) return "";
    const maxDots = 4;
    const todoDots = todoRows.slice(0, Math.max(0, maxDots - (caseDayRows.length ? 1 : 0))).map((todo, idx) => {
        const color = TODO_DOT_COLORS[idx % TODO_DOT_COLORS.length];
        const opacity = todo.done ? "0.45" : "1";
        return `<span class="day-dot" style="background:${color};opacity:${opacity};"></span>`;
    });
    const caseDots = caseDayRows.length ? [`<span class="day-dot" style="background:${CASE_DOT_COLOR};opacity:1;"></span>`] : [];
    const dots = [...caseDots, ...todoDots].slice(0, maxDots).join("");
    return `<div class="day-dots">${dots}</div>`;
}

function renderCalendarGrid() {
    const monthLabelEl = document.getElementById("calendarMonthLabel");
    const grid = document.getElementById("calendarGrid");
    if (!monthLabelEl || !grid) return;

    monthLabelEl.innerText = formatMonthLabel(currentMonthDate);

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const firstDayMondayIndex = (firstDay.getDay() + 6) % 7;

    const todayKey = toDateKey(new Date());
    const selectedKey = toDateKey(selectedDate);
    const cells = [];

    for (let i = firstDayMondayIndex - 1; i >= 0; i--) {
        const dayNum = daysInPrevMonth - i;
        const dayDate = new Date(year, month - 1, dayNum);
        const dayKey = toDateKey(dayDate);
        cells.push(`
            <button type="button" class="calendar-day day-out ${dayKey === selectedKey ? "day-selected" : ""}" data-date="${dayKey}">
                <span class="day-number">${dayNum}</span>
                ${getDayDotHtml(dayDate)}
            </button>
        `);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDate = new Date(year, month, day);
        const dayKey = toDateKey(dayDate);
        const todayClass = dayKey === todayKey ? "day-today" : "";
        const selectedClass = dayKey === selectedKey ? "day-selected" : "";
        cells.push(`
            <button type="button" class="calendar-day ${todayClass} ${selectedClass}" data-date="${dayKey}">
                <span class="day-number">${day}</span>
                ${getDayDotHtml(dayDate)}
            </button>
        `);
    }

    const totalCells = 42;
    let nextDay = 1;
    while (cells.length < totalCells) {
        const dayDate = new Date(year, month + 1, nextDay);
        const dayKey = toDateKey(dayDate);
        cells.push(`
            <button type="button" class="calendar-day day-out ${dayKey === selectedKey ? "day-selected" : ""}" data-date="${dayKey}">
                <span class="day-number">${nextDay}</span>
                ${getDayDotHtml(dayDate)}
            </button>
        `);
        nextDay += 1;
    }

    grid.innerHTML = cells.join("");

    grid.querySelectorAll(".calendar-day").forEach((btn) => {
        btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-date");
            if (!key) return;
            const d = parseDate(`${key}T00:00:00`);
            if (!d) return;
            selectedDate = d;
            currentMonthDate = new Date(d.getFullYear(), d.getMonth(), 1);
            renderCalendarGrid();
            renderTodoListForSelectedDate();
            closeAddTodoForm();
        });
    });
}

function renderTodoListForSelectedDate() {
    const titleEl = document.getElementById("selectedDateTitle");
    const countEl = document.getElementById("selectedDateCount");
    const inlineDateEl = document.getElementById("selectedDateInline");
    const listEl = document.getElementById("todoCalendarList");
    if (!titleEl || !countEl || !listEl) return;

    const key = toDateKey(selectedDate);
    const rows = todosByDate.get(key) || [];
    const caseDayRows = casesByDate.get(key) || [];
    const totalItems = rows.length + caseDayRows.length;

    titleEl.innerText = formatSelectedHeader(selectedDate);
    countEl.innerText = totalItems === 1 ? "1 item" : `${totalItems} items`;
    if (inlineDateEl) {
        inlineDateEl.innerText = key;
    }

    if (!rows.length && !caseDayRows.length) {
        listEl.innerHTML = `<div class="todo-empty">No items for this date.</div>`;
        return;
    }

    const caseHtml = caseDayRows.map((row) => {
        const stepLabel = String(row.case_status_label || "Step");
        return `
            <div class="todo-row case-row">
                <span class="todo-marker case" style="border-color:${CASE_DOT_COLOR};background:${CASE_DOT_COLOR};"></span>
                <div class="todo-text">
                    <p class="todo-title-line">Case ${escapeHtml(row.case_no || "")}</p>
                    <p class="todo-sub-line">${escapeHtml(row.customer_name || "")} | ${escapeHtml(row.court || "")} | ${escapeHtml(stepLabel)}</p>
                </div>
                <span class="todo-time case-label">CASE</span>
            </div>
        `;
    }).join("");

    const todoHtml = rows.map((todo) => {
        const color = "#f5c000";
        const doneClass = todo.done ? "done" : "";
        const doneLabel = todo.done && todo.done_by_name ? `Done by ${todo.done_by_name}` : "Open task";
        return `
            <div class="todo-row" data-todo-id="${todo.id}">
                <button type="button" class="todo-marker todo-toggle ${doneClass}" data-todo-toggle="${todo.id}" aria-label="Toggle to-do done" style="border-color:${color};${todo.done ? `background:${color};` : ""}"></button>
                <div class="todo-text">
                    <p class="todo-title-line">${escapeHtml(todo.title || "Untitled task")}</p>
                    <p class="todo-sub-line">${escapeHtml(doneLabel)}</p>
                </div>
                <span class="todo-time">${formatTodoTime(todo)}</span>
            </div>
        `;
    }).join("");

    listEl.innerHTML = `${caseHtml}${todoHtml}`;

    listEl.querySelectorAll("[data-todo-toggle]").forEach((el) => {
        el.addEventListener("click", async (e) => {
            const id = Number(e.currentTarget.getAttribute("data-todo-toggle"));
            const row = rows.find((t) => Number(t.id) === id);
            const checked = !Boolean(row?.done);
            try {
                await request(`/todos/${id}`, "PUT", { done: checked });
                await loadTodosForCalendarMonth();
                renderCalendarGrid();
                renderTodoListForSelectedDate();
            } catch (err) {
                showMessageBox(err.message || "Failed to update to-do", "error");
            }
        });
    });
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

async function loadCasesForCalendarMonth() {
    try {
        const range = monthRangeYmd(currentMonthDate);
        const rows = await request(`/cases/calendar-feed?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`, "GET");
        caseRows = (Array.isArray(rows) ? rows : []).map((row) => ({
            ...row,
            case_date: normalizeCaseDate(row),
        }));
    } catch (err) {
        console.error(err);
        caseRows = [];
    }
    buildCasesByDateIndex();
}

async function loadTodosForCalendarMonth() {
    try {
        const range = monthRangeYmd(currentMonthDate);
        const rows = await request(`/todos?start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end)}`, "GET");
        todos = Array.isArray(rows) ? rows : [];
    } catch (err) {
        console.error(err);
        todos = [];
    }
    buildTodosByDateIndex();
}

function bindCalendarNavigation() {
    const prevBtn = document.getElementById("prevMonthBtn");
    const nextBtn = document.getElementById("nextMonthBtn");

    const reloadMonth = async () => {
        await loadCasesForCalendarMonth();
        await loadTodosForCalendarMonth();
        renderCalendarGrid();
        renderTodoListForSelectedDate();
    };

    if (prevBtn) {
        prevBtn.addEventListener("click", async () => {
            currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
            await reloadMonth();
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener("click", async () => {
            currentMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
            await reloadMonth();
        });
    }
}

async function loadTodoAssigneesForCalendar() {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const assignEl = document.getElementById("addTodoAssign");
    if (!assignEl) return;
    if (role !== "admin" && role !== "manager") {
        assignEl.classList.add("hidden");
        return;
    }
    try {
        const users = await request("/users/assignable", "GET");
        (Array.isArray(users) ? users : []).forEach((u) => {
            const opt = document.createElement("option");
            opt.value = u.id;
            opt.textContent = u.username || u.email || `User ${u.id}`;
            assignEl.appendChild(opt);
        });
    } catch (_err) {
    }
}

function setAddTodoError(message) {
    const errEl = document.getElementById("addTodoError");
    if (!errEl) return;
    const msg = String(message || "").trim();
    if (!msg) {
        errEl.classList.add("hidden");
        errEl.innerText = "";
        return;
    }
    errEl.innerText = msg;
    errEl.classList.remove("hidden");
}

function openAddTodoForm() {
    const form = document.getElementById("addTodoForm");
    const input = document.getElementById("addTodoInput");
    if (!form || !input) return;
    form.classList.remove("hidden");
    setAddTodoError("");
    input.focus();
}

function closeAddTodoForm() {
    const form = document.getElementById("addTodoForm");
    const input = document.getElementById("addTodoInput");
    const assign = document.getElementById("addTodoAssign");
    if (!form || !input || !assign) return;
    form.classList.add("hidden");
    setAddTodoError("");
    input.value = "";
    assign.value = "";
}

function bindAddTodoForm() {
    const addBtn = document.getElementById("addTodoBtn");
    const form = document.getElementById("addTodoForm");
    const input = document.getElementById("addTodoInput");
    const assign = document.getElementById("addTodoAssign");
    const cancelBtn = document.getElementById("cancelTodoBtn");
    if (!addBtn || !form || !input || !assign || !cancelBtn) return;

    addBtn.addEventListener("click", () => {
        if (form.classList.contains("hidden")) {
            openAddTodoForm();
        } else {
            closeAddTodoForm();
        }
    });

    cancelBtn.addEventListener("click", () => {
        closeAddTodoForm();
    });

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = String(input.value || "").trim();
        if (!title) {
            setAddTodoError("Please enter a to-do title.");
            return;
        }
        setAddTodoError("");
        try {
            const assigned_to = assign.value ? Number(assign.value) : null;
            await request("/todos", "POST", {
                title,
                assigned_to,
                todo_date: toDateKey(selectedDate)
            });
            closeAddTodoForm();
            await loadTodosForCalendarMonth();
            renderCalendarGrid();
            renderTodoListForSelectedDate();
        } catch (err) {
            setAddTodoError(err.message || "Failed to add to-do.");
        }
    });
}

function setWelcomeRole() {
    const role = localStorage.getItem("role") || "user";
    const p = document.querySelector(".calendar-header-card .muted");
    if (!p) return;
    p.innerText = `Monthly calendar with case schedule and to-do (${role})`;
}

window.addEventListener("DOMContentLoaded", async () => {
    bindCalendarNavigation();
    bindAddTodoForm();
    setWelcomeRole();
    await loadTodoAssigneesForCalendar();
    await loadCasesForCalendarMonth();
    await loadTodosForCalendarMonth();
    renderCalendarGrid();
    renderTodoListForSelectedDate();
});
