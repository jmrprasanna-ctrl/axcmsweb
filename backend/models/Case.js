const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Customer = require("./Customer");

const LegalCase = db.define("LegalCase", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    case_no: { type: DataTypes.STRING, allowNull: false },
    case_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    next_date: { type: DataTypes.DATEONLY, allowNull: true },
    customer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Customer, key: "id" } },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    court: { type: DataTypes.STRING, allowNull: false },
    court_type: { type: DataTypes.STRING(40), allowNull: true },
    category: { type: DataTypes.STRING(120), allowNull: true },
    attend_lawyer: { type: DataTypes.STRING, allowNull: false },
    case_step: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "STEP" },
    comment: { type: DataTypes.TEXT, allowNull: true },
    upload_method: { type: DataTypes.STRING, allowNull: true },
    uploads_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    edit_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, { tableName: "cases", timestamps: true });

LegalCase.belongsTo(Customer, { foreignKey: "customer_id" });
Customer.hasMany(LegalCase, { foreignKey: "customer_id" });

module.exports = LegalCase;
