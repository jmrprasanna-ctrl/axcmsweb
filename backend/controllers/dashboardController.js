const User = require("../models/User");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const InvoiceItem = require("../models/InvoiceItem");
const Expense = require("../models/Expense");
const LegalCase = require("../models/Case");
const { Op, fn, col, where: sqWhere } = require("sequelize");

function sumTechnicianPaid(rows){
    return (Array.isArray(rows) ? rows : []).reduce((sum, inv) => {
        const technician = String(inv.support_technician || "").trim();
        const total = Number(inv.total_amount || 0);
        const rawPct = Number(inv.support_technician_percentage || 0);
        const pct = Number.isFinite(rawPct) ? Math.min(Math.max(rawPct, 0), 100) : 0;
        if(!technician) return sum;
        if(!Number.isFinite(total) || !Number.isFinite(pct) || pct <= 0) return sum;
        return sum + (total * pct / 100);
    }, 0);
}

function getReceivedPaymentStatusFilter(){
    return {
        [Op.or]: [
            { [Op.iLike]: "%received%" },
            { [Op.iLike]: "%recieved%" }
        ]
    };
}

function getGeneralCustomerInclude(){
    return {
        model: Customer,
        required: true,
        attributes: [],
        where: {
            customer_mode: {
                [Op.iLike]: "general"
            }
        }
    };
}

function toDateOnlyText(value){
    const raw = String(value || "").trim();
    if(!raw) return "";
    if(/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const dt = new Date(raw);
    if(Number.isNaN(dt.getTime())) return "";
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function toDateOnlyTextInTimeZone(value, timeZone = "Asia/Colombo"){
    const dt = value instanceof Date ? value : new Date(value || Date.now());
    if(Number.isNaN(dt.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(dt);
    const year = parts.find((p) => p.type === "year")?.value || "";
    const month = parts.find((p) => p.type === "month")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "";
    if(!year || !month || !day) return "";
    return `${year}-${month}-${day}`;
}

function addDaysToDateOnlyText(dateText, days){
    const safe = String(dateText || "").trim();
    if(!/^\d{4}-\d{2}-\d{2}$/.test(safe)) return "";
    const base = new Date(`${safe}T00:00:00`);
    if(Number.isNaN(base.getTime())) return "";
    base.setDate(base.getDate() + Number(days || 0));
    return toDateOnlyText(base);
}

function parseBaseDateInput(value){
    const normalized = toDateOnlyText(value);
    if(normalized){
        return new Date(`${normalized}T00:00:00`);
    }
    const dt = value ? new Date(value) : new Date();
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

function buildDateOnlyRangeWhere(columnName, startDate, endDate){
    return sqWhere(
        fn("DATE", col(columnName)),
        { [Op.between]: [startDate, endDate] }
    );
}

function normalizeCaseStep(value){
    const raw = String(value || "").trim().toUpperCase();
    if (raw === "FINISHED" || raw === "FINISHED_STEP" || raw === "FINISHED STEP") return "FINISHED";
    if (raw === "PLAINT STEP" || raw === "PLAINT_STEP" || raw === "PLAINTSTEP") return "PLAINT_STEP";
    if (raw === "ANSWER STEP" || raw === "ANSWER_STEP" || raw === "ANSWERSTEP") return "ANSWER_STEP";
    if (raw === "L/W STEP" || raw === "L_W_STEP" || raw === "LW STEP" || raw === "LW_STEP" || raw === "LWSTEP") return "LW_STEP";
    if (raw === "DUDGMENT STEP" || raw === "DUDGMENT_STEP" || raw === "DUDGMENTSTEP" || raw === "JUDGMENT STEP" || raw === "JUDGMENT_STEP" || raw === "JUDGMENTSTEP") return "DUDGMENT_STEP";
    return "STEP";
}

function toCaseStepLabel(stepValue){
    const step = normalizeCaseStep(stepValue);
    if (step === "PLAINT_STEP") return "Plaint";
    if (step === "ANSWER_STEP") return "Answer";
    if (step === "LW_STEP") return "L/W";
    if (step === "DUDGMENT_STEP") return "Dudgment";
    if (step === "FINISHED") return "Finished";
    return "Step";
}

exports.getSummary = async (req,res)=>{
    try{
        const period = String(req.query.period || "day").toLowerCase();
        const dateStr = req.query.date;
        const baseDate = parseBaseDateInput(dateStr);
        if(isNaN(baseDate.getTime())){
            return res.status(400).json({ message: "Invalid date" });
        }

        let periodStart = new Date(baseDate);
        let periodEnd = new Date(baseDate);

        if(period === "week"){
            const day = periodStart.getDay();         
            const diffToMonday = (day + 6) % 7;
            periodStart.setDate(periodStart.getDate() - diffToMonday);
            periodStart.setHours(0,0,0,0);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodStart.getDate() + 6);
            periodEnd.setHours(23,59,59,999);
        }else if(period === "month"){
            periodStart = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1, 0,0,0,0);
            periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23,59,59,999);
        }else if(period === "year"){
            periodStart = new Date(periodStart.getFullYear(), 0, 1, 0,0,0,0);
            periodEnd = new Date(periodStart.getFullYear(), 11, 31, 23,59,59,999);
        }else{
            periodStart.setHours(0,0,0,0);
            periodEnd.setHours(23,59,59,999);
        }
        const periodStartDate = toDateOnlyText(periodStart) || new Date(periodStart).toISOString().slice(0, 10);
        const periodEndDate = toDateOnlyText(periodEnd) || new Date(periodEnd).toISOString().slice(0, 10);

        const totalUsers = await User.count();
        const totalCustomers = await Customer.count();
        const totalCasesRows = await LegalCase.findAll({
            attributes: [[fn("DISTINCT", col("case_no")), "case_no"]],
            where: {
                case_step: "STEP"
            },
            raw: true,
        });
        const totalCases = Array.isArray(totalCasesRows) ? totalCasesRows.length : 0;
        const colomboToday = toDateOnlyTextInTimeZone(new Date(), "Asia/Colombo") || toDateOnlyText(new Date());
        const startDate = colomboToday;
        const endDate = addDaysToDateOnlyText(colomboToday, 3) || colomboToday;
        const upcomingCaseRows = await LegalCase.findAll({
            where: {
                [Op.and]: [
                    {
                        [Op.or]: [
                            { case_step: { [Op.ne]: "FINISHED" } },
                            { case_step: null }
                        ]
                    },
                    {
                        [Op.or]: [
                            {
                                next_date: {
                                    [Op.between]: [startDate, endDate]
                                }
                            },
                            {
                                [Op.and]: [
                                    { next_date: null },
                                    {
                                        case_date: {
                                            [Op.between]: [startDate, endDate]
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                ]
            },
            attributes: ["id", "case_no", "customer_name", "court", "attend_lawyer", "case_step", "next_date", "case_date"],
            order: [["next_date", "ASC"], ["case_date", "ASC"], ["id", "DESC"]],
            raw: true
        });
        const seenCaseNo = new Set();
        const upcomingCasesNext3Days = (Array.isArray(upcomingCaseRows) ? upcomingCaseRows : [])
            .filter((row) => {
                const key = String(row.case_no || "").trim().toUpperCase();
                if (!key) return false;
                if (seenCaseNo.has(key)) return false;
                seenCaseNo.add(key);
                return true;
            })
            .map((row) => ({
                id: Number(row.id || 0) || null,
                case_no: row.case_no || "",
                customer_name: row.customer_name || "",
                court: row.court || "",
                step: toCaseStepLabel(row.case_step),
                attend_lawyer: row.attend_lawyer || "",
                next_date: row.next_date || row.case_date || null
            }));
        const totalSalesPeriod = await Invoice.sum("total_amount",{
            where: buildDateOnlyRangeWhere("invoice_date", periodStartDate, periodEndDate)
        }) || 0;
        const totalExpensesPeriod = await Expense.sum("amount",{
            where: buildDateOnlyRangeWhere("date", periodStartDate, periodEndDate)
        }) || 0;
                                                                           
        const receivedPaymentPeriod = await Invoice.sum("total_amount",{
            include: [getGeneralCustomerInclude()],
            where:{
                [Op.and]: [
                    buildDateOnlyRangeWhere("invoice_date", periodStartDate, periodEndDate),
                    { payment_status: getReceivedPaymentStatusFilter() }
                ]
            }
        }) || 0;
        const invoicesPeriodForCard = await Invoice.findAll({
            where:{
                [Op.and]: [
                    buildDateOnlyRangeWhere("invoice_date", periodStartDate, periodEndDate),
                    { support_technician: { [Op.not]: null } }
                ]
            },
            attributes:["id","total_amount","support_technician","support_technician_percentage"],
            include: [
                {
                    model: InvoiceItem,
                    required: false,
                    attributes: ["qty"]
                }
            ]
        });
        const technicianPaidPeriod = sumTechnicianPaid(invoicesPeriodForCard);
        const vendorPaidPeriod = 0;
        const netProfitPeriod = receivedPaymentPeriod - totalExpensesPeriod - technicianPaidPeriod - vendorPaidPeriod;

        const totalSalesAllTime = await Invoice.sum("total_amount") || 0;
        const totalExpensesAllTime = await Expense.sum("amount") || 0;
        const receivedPaymentAllTime = await Invoice.sum("total_amount", {
            include: [getGeneralCustomerInclude()],
            where: {
                payment_status: getReceivedPaymentStatusFilter()
            }
        }) || 0;
        const invoicesAllTimeForCard = await Invoice.findAll({
            where: {
                support_technician: { [Op.not]: null }
            },
            attributes:["id","total_amount","support_technician","support_technician_percentage"],
            include: [
                {
                    model: InvoiceItem,
                    required: false,
                    attributes: ["qty"]
                }
            ]
        });
        const technicianPaidAllTime = sumTechnicianPaid(invoicesAllTimeForCard);
        const vendorPaidAllTime = 0;
        const netProfitAllTime = receivedPaymentAllTime - totalExpensesAllTime - technicianPaidAllTime - vendorPaidAllTime;
<<<<<<< HEAD
        const rentalCountsAllTimeRows = await RentalMachineCount.findAll({
            attributes: ["input_count", "updated_count"]
        });
        const rentalMachinesCountsPriceAllTime = sumRentalCountPrice(rentalCountsAllTimeRows);
        const rentalConsumablesAllTimeRows = await RentalMachineConsumable.findAll({
            include: [{ model: Product, required: false, attributes: ["id", "dealer_price"] }],
            attributes: ["quantity"]
        });
        const rentalConsumablesPriceAllTime = sumRentalConsumablesPrice(rentalConsumablesAllTimeRows);

                                      
        const lowStock = await Product.findAll({
            where:{ count:{ [Op.lt]:5 } },
            attributes:["product_id","description","count"]
        });
=======
        const lowStock = [];
>>>>>>> 046c6f3 (feat: apply AXIS web updates across backend and frontend)

                                        
        const months = [];
        const monthlySales = [];
        const monthlyProfit = [];
        const currentYear = baseDate.getFullYear();

        for(let m=0;m<12;m++){
            const start = new Date(currentYear,m,1);
            const end = new Date(currentYear,m+1,0);
            const startText = toDateOnlyText(start);
            const endText = toDateOnlyText(end);

            const salesInvoices = await Invoice.findAll({
                where: buildDateOnlyRangeWhere("invoice_date", startText, endText),
                include:[{
                    model: InvoiceItem,
                    required: false
                }]
            });

            let monthSales = 0;
            let monthProfit = 0;
            salesInvoices.forEach(inv=>{
                monthSales += inv.total_amount;
                const technician = String(inv.support_technician || "").trim();
                const rawPct = Number(inv.support_technician_percentage || 0);
                const pct = Number.isFinite(rawPct) ? Math.min(Math.max(rawPct, 0), 100) : 0;
                const totalAmount = Number(inv.total_amount || 0);
                const lineGross = (Array.isArray(inv.InvoiceItems) ? inv.InvoiceItems : []).reduce((a,b)=>a + Number(b.gross || 0),0);
                const technicianPaid = technician ? (totalAmount * pct) / 100 : 0;
                monthProfit += totalAmount - lineGross - technicianPaid;
            });
            months.push(start.toLocaleString('default',{month:'short'}));
            monthlySales.push(monthSales);
            monthlyProfit.push(monthProfit);
        }

        res.json({
            totalUsers,
            totalCustomers,
            totalCases,
            totalSales: totalSalesPeriod,
            receivedPayment: receivedPaymentPeriod,
            totalExpenses: totalExpensesPeriod,
            netProfit: netProfitPeriod,
            totalSalesAllTime,
            receivedPaymentAllTime,
            totalExpensesAllTime,
            netProfitAllTime,
            totalSalesPeriod,
            receivedPaymentPeriod,
            totalExpensesPeriod,
            netProfitPeriod,
            lowStock,
            months,
            monthlySales,
            monthlyProfit,
            upcomingCasesNext3Days,
            period,
            periodStart,
            periodEnd
        });

    }catch(err){
        console.error(err);
        res.status(500).json({ message:"Failed to get dashboard summary" });
    }
}
