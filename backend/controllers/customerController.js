const Customer = require("../models/Customer");
const db = require("../config/database");
const { generateNextCustomerCode } = require("../utils/customerCodeGenerator");

const toUpper = (value) => String(value || "").trim().toUpperCase();

function isCustomerIdUniqueConflict(error) {
    if (!error || error.name !== "SequelizeUniqueConstraintError") return false;
    return Array.isArray(error.errors) && error.errors.some((e) =>
        String(e.path || "").toLowerCase() === "customer_id"
    );
}

function normalizeComment(comment) {
    return String(comment || "").trim();
}

function countWords(text) {
    const trimmed = String(text || "").trim();
    if(!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
}

function toNullableTrimmed(value) {
    const trimmed = String(value || "").trim();
    return trimmed || null;
}

exports.getCustomers = async (req,res)=>{
    const customers = await Customer.findAll();
    res.json(customers);
}

exports.getCustomerById = async (req,res)=>{
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if(!customer){
        return res.status(404).json({ message: "Customer not found." });
    }
    res.json(customer);
};

exports.createCustomer = async (req,res)=>{
    try{
        const { name, address, quotation2_address, tel, mobile, contact_person, comment, email } = req.body;
        if(!name){
            return res.status(400).json({ message: "Customer name is required." });
        }
        if(!address){
            return res.status(400).json({ message: "Address is required." });
        }
        const normalizedName = toUpper(name);
        const normalizedAddress = toUpper(address);
        const normalizedQuotation2Address = toUpper(quotation2_address);
        const normalizedContactPerson = String(contact_person || "").trim();
        const normalizedComment = normalizeComment(comment);
        const normalizedTel = toNullableTrimmed(tel);
        const normalizedMobile = toNullableTrimmed(mobile);
        const normalizedEmail = toNullableTrimmed(email);
        if(countWords(normalizedComment) > 5000){
            return res.status(400).json({ message: "Comment is too long (max 5000 words)." });
        }

        let created = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
            try {
                created = await db.transaction(async (transaction) => {
                    const customerCode = await generateNextCustomerCode({
                        customerName: normalizedName,
                        CustomerModel: Customer,
                        transaction,
                    });
                    return Customer.create({
                        customer_id: customerCode,
                        name: normalizedName,
                        address: normalizedAddress,
                        quotation2_address: normalizedQuotation2Address,
                        tel: normalizedTel,
                        mobile: normalizedMobile,
                        contact_person: normalizedContactPerson || null,
                        comment: normalizedComment || null,
                        email: normalizedEmail
                    }, { transaction });
                });
                break;
            } catch (err) {
                if (!isCustomerIdUniqueConflict(err) || attempt === 4) {
                    throw err;
                }
            }
        }

        res.status(201).json(created);
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to add customer." });
    }
};

exports.updateCustomer = async (req,res)=>{
    try{
        const { id } = req.params;
        const { name, address, quotation2_address, tel, mobile, contact_person, comment, email } = req.body;
        if(!name){
            return res.status(400).json({ message: "Customer name is required." });
        }
        if(!address){
            return res.status(400).json({ message: "Address is required." });
        }
        const normalizedComment = normalizeComment(comment);
        const normalizedTel = toNullableTrimmed(tel);
        const normalizedMobile = toNullableTrimmed(mobile);
        const normalizedEmail = toNullableTrimmed(email);
        if(countWords(normalizedComment) > 5000){
            return res.status(400).json({ message: "Comment is too long (max 5000 words)." });
        }
        await db.transaction(async (transaction) => {
            const customerForUpdate = await Customer.findByPk(id, { transaction });
            if(!customerForUpdate){
                throw new Error("Customer not found.");
            }

            let customerCode = customerForUpdate.customer_id;
            if(!customerCode){
                customerCode = await generateNextCustomerCode({
                    customerName: name,
                    CustomerModel: Customer,
                    transaction,
                    excludeCustomerPk: id,
                });
            }

            await customerForUpdate.update({
                customer_id: customerCode,
                name: toUpper(name),
                address: toUpper(address),
                quotation2_address: toUpper(quotation2_address),
                tel: normalizedTel,
                mobile: normalizedMobile,
                contact_person: String(contact_person || "").trim() || null,
                comment: normalizedComment || null,
                email: normalizedEmail
            }, { transaction });
        });
        const updatedCustomer = await Customer.findByPk(id);
        res.json(updatedCustomer);
    }catch(err){
        if (String(err.message || "") === "Customer not found.") {
            return res.status(404).json({ message: "Customer not found." });
        }
        res.status(500).json({ message: err.message || "Failed to update customer." });
    }
};

exports.deleteCustomer = async (req,res)=>{
    try{
        const { id } = req.params;
        const customer = await Customer.findByPk(id);
        if(!customer){
            return res.status(404).json({ message: "Customer not found." });
        }
        await customer.destroy();
        res.json({ message: "Customer deleted successfully." });
    }catch(err){
        res.status(500).json({ message: err.message || "Failed to delete customer." });
    }
};
