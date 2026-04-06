const Expense = require("../models/Expense");

const ALLOWED_EXPENSE_CATEGORIES = new Set([
    "Lawyer Payment",
    "Colombo Court Visit",
    "Outsttion Court Visit",
    "Document Charges",
    "Failing Charges",
    "Personal",
    "Other",
    "Sallary Pay"
]);

const LEGACY_CATEGORY_MAP = {
    "repair": "Other",
    "customer visit": "Colombo Court Visit",
    "brekdown": "Other",
    "breakdown": "Other",
    "miscellaneous": "Other",
    "salary pay": "Sallary Pay"
};

function normalizeText(value){
    return String(value || "").trim();
}

function normalizeCategory(value){
    const raw = normalizeText(value);
    if(!raw) return "";
    if(ALLOWED_EXPENSE_CATEGORIES.has(raw)){
        return raw;
    }
    const mapped = LEGACY_CATEGORY_MAP[raw.toLowerCase()];
    return mapped || "";
}

exports.getExpenses = async (req,res)=>{
    try{
        const expenses = await Expense.findAll({ order: [["id","DESC"]] });
        res.json(expenses);
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to load expenses." });
    }
};

exports.getExpenseById = async (req,res)=>{
    const { id } = req.params;
    const expense = await Expense.findByPk(id);
    if(!expense){
        return res.status(404).json({ message: "Expense not found." });
    }
    res.json(expense);
};

exports.createExpense = async (req,res)=>{
    try{
        const { title, customer, client, amount, date, category } = req.body;
        if(!title || amount === undefined || !date || !category){
            return res.status(400).json({ message: "Missing required fields." });
        }
        const normalizedCategory = normalizeCategory(category);
        if(!normalizedCategory){
            return res.status(400).json({ message: "Invalid expense category." });
        }
        const clientName = normalizeText(client || customer);
        const created = await Expense.create({
            title: normalizeText(title),
            customer: clientName,
            client: clientName,
            amount,
            date,
            category: normalizedCategory
        });
        res.status(201).json(created);
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to add expense." });
    }
};

exports.updateExpense = async (req,res)=>{
    try{
        const { id } = req.params;
        const { title, customer, client, amount, date, category } = req.body;
        if(!title || amount === undefined || !date || !category){
            return res.status(400).json({ message: "Missing required fields." });
        }
        const normalizedCategory = normalizeCategory(category);
        if(!normalizedCategory){
            return res.status(400).json({ message: "Invalid expense category." });
        }
        const expense = await Expense.findByPk(id);
        if(!expense){
            return res.status(404).json({ message: "Expense not found." });
        }
        const clientName = normalizeText(client || customer);
        await expense.update({
            title: normalizeText(title),
            customer: clientName,
            client: clientName,
            amount,
            date,
            category: normalizedCategory
        });
        res.json(expense);
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to update expense." });
    }
};

exports.deleteExpense = async (req,res)=>{
    try{
        const { id } = req.params;
        const expense = await Expense.findByPk(id);
        if(!expense){
            return res.status(404).json({ message: "Expense not found." });
        }
        await expense.destroy();
        res.json({ message: "Expense deleted successfully." });
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to delete expense." });
    }
};
