const { Op } = require("sequelize");
const Invoice = require("../models/Invoice");
const Expense = require("../models/Expense");

function toDateOnly(date){
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseReferenceDate(raw){
    const value = String(raw || "").trim();
    if(!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function clampPeriod(raw){
    const period = String(raw || "month").trim().toLowerCase();
    if(period === "week" || period === "month" || period === "year") return period;
    return "month";
}

function getRange(period, refDate){
    if(period === "week"){
        const day = refDate.getDay();
        const diffToMonday = (day + 6) % 7;
        const start = new Date(refDate);
        start.setDate(refDate.getDate() - diffToMonday);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    if(period === "year"){
        return {
            start: new Date(refDate.getFullYear(), 0, 1, 0, 0, 0, 0),
            end: new Date(refDate.getFullYear(), 11, 31, 23, 59, 59, 999)
        };
    }

    return {
        start: new Date(refDate.getFullYear(), refDate.getMonth(), 1, 0, 0, 0, 0),
        end: new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999)
    };
}

async function sumSalesByDate(startDate, endDate){
    return Number(await Invoice.sum("total_amount", {
        where: { invoice_date: { [Op.between]: [toDateOnly(startDate), toDateOnly(endDate)] } }
    }) || 0);
}

async function buildSalesRows(period, referenceDate){
    const rows = [];

    if(period === "week"){
        const { start } = getRange(period, referenceDate);
        for(let i = 0; i < 7; i++){
            const day = new Date(start);
            day.setDate(start.getDate() + i);
            const totalSales = await sumSalesByDate(day, day);
            rows.push({
                label: day.toLocaleString("default", { weekday: "short" }),
                total_sales: Number(totalSales.toFixed(2))
            });
        }
        return rows;
    }

    if(period === "year"){
        const year = referenceDate.getFullYear();
        for(let month = 0; month < 12; month++){
            const start = new Date(year, month, 1, 0, 0, 0, 0);
            const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
            const totalSales = await sumSalesByDate(start, end);
            rows.push({
                label: start.toLocaleString("default", { month: "short" }),
                total_sales: Number(totalSales.toFixed(2))
            });
        }
        return rows;
    }

    const { start, end } = getRange("month", referenceDate);
    const totalDays = end.getDate();
    for(let dayNum = 1; dayNum <= totalDays; dayNum++){
        const day = new Date(start.getFullYear(), start.getMonth(), dayNum, 0, 0, 0, 0);
        const totalSales = await sumSalesByDate(day, day);
        rows.push({
            label: String(dayNum).padStart(2, "0"),
            total_sales: Number(totalSales.toFixed(2))
        });
    }
    return rows;
}

exports.salesChart = async (req,res)=>{
    try{
        const period = clampPeriod(req.query.period);
        const referenceDate = parseReferenceDate(req.query.date);
        const range = getRange(period, referenceDate);
        const rows = await buildSalesRows(period, referenceDate);
        res.json({
            period,
            start_date: toDateOnly(range.start),
            end_date: toDateOnly(range.end),
            rows
        });
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to load sales chart." });
    }
};

exports.profitChart = async (req,res)=>{
    try{
        const rows = [];
        const currentYear = new Date().getFullYear();
        for(let m=0;m<12;m++){
            const start = new Date(currentYear,m,1);
            const end = new Date(currentYear,m+1,0,23,59,59,999);
            const total_sales = await Invoice.sum("total_amount",{
                where:{ invoice_date:{ [Op.between]:[start,end] } }
            }) || 0;
            const total_expenses = await Expense.sum("amount",{
                where:{ date:{ [Op.between]:[start,end] } }
            }) || 0;
            rows.push({
                month: start.toLocaleString("default",{month:"short"}),
                net_profit: total_sales - total_expenses
            });
        }
        res.json(rows);
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to load profit chart." });
    }
};
