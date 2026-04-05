const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Customer = require("./Customer");
const LegalCase = require("./Case");
const Answer = require("./Answer");

const Witness = db.define("Witness", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    witness_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    answer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Answer, key: "id" } },
    case_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: LegalCase, key: "id" } },
    customer_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: Customer, key: "id" } },
    customer_name: { type: DataTypes.STRING, allowNull: false },
    case_no: { type: DataTypes.STRING, allowNull: false },
    court: { type: DataTypes.STRING, allowNull: false },
    attend_lawyer: { type: DataTypes.STRING, allowNull: false },
    witness_step: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "STEP" },
    witness_list: { type: DataTypes.TEXT, allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
    upload_method: { type: DataTypes.STRING, allowNull: true },
    uploads_json: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    edit_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
}, { tableName: "witnesses", timestamps: true });

Witness.belongsTo(Answer, { foreignKey: "answer_id" });
Answer.hasMany(Witness, { foreignKey: "answer_id" });
Witness.belongsTo(LegalCase, { foreignKey: "case_id" });
LegalCase.hasMany(Witness, { foreignKey: "case_id" });
Witness.belongsTo(Customer, { foreignKey: "customer_id" });
Customer.hasMany(Witness, { foreignKey: "customer_id" });

module.exports = Witness;
