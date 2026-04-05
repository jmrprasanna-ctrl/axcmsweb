const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Customer = require("./Customer");
const LegalCase = require("./Case");

const Judgment = db.define("Judgment", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    judgment_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: LegalCase, key: "id" } },
    customer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Customer, key: "id" } },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    case_no: { type: DataTypes.STRING, allowNull: false },
    court: { type: DataTypes.STRING, allowNull: false },
    attend_lawyer: { type: DataTypes.STRING, allowNull: false },
    judgment_text: { type: DataTypes.TEXT, allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
    upload_method: { type: DataTypes.STRING, allowNull: true },
    uploads_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    edit_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    finished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, { tableName: "judgments", timestamps: true });

Judgment.belongsTo(LegalCase, { foreignKey: "case_id" });
LegalCase.hasMany(Judgment, { foreignKey: "case_id" });
Judgment.belongsTo(Customer, { foreignKey: "customer_id" });
Customer.hasMany(Judgment, { foreignKey: "customer_id" });

module.exports = Judgment;
