const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Customer = require("./Customer");
const LegalCase = require("./Case");

const Answer = db.define("Answer", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    answer_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    plaint_id: { type: DataTypes.INTEGER, allowNull: true },
    case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: LegalCase, key: "id" } },
    customer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Customer, key: "id" } },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    case_no: { type: DataTypes.STRING, allowNull: false },
    court: { type: DataTypes.STRING, allowNull: false },
    attend_lawyer: { type: DataTypes.STRING, allowNull: false },
    answer_step: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "STEP" },
    comment: { type: DataTypes.TEXT, allowNull: true },
    upload_method: { type: DataTypes.STRING, allowNull: true },
    uploads_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    client_request_id: { type: DataTypes.STRING(80), allowNull: true, unique: true },
    edit_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, { tableName: "answers", timestamps: true });

Answer.belongsTo(LegalCase, { foreignKey: "case_id" });
LegalCase.hasMany(Answer, { foreignKey: "case_id" });
Answer.belongsTo(Customer, { foreignKey: "customer_id" });
Customer.hasMany(Answer, { foreignKey: "customer_id" });

module.exports = Answer;
