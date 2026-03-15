const { DataTypes } = require("sequelize");
const db = require("../config/database");
const Product = require("./Product");

const Stock = db.define("Stock",{
    id:{ type: DataTypes.INTEGER, primaryKey:true, autoIncrement:true },
    product_id:{ type: DataTypes.INTEGER, references:{ model:Product,key:"id" } },
    change:{ type: DataTypes.INTEGER },
    type:{ type: DataTypes.STRING },
    date:{ type: DataTypes.DATE, defaultValue:DataTypes.NOW },
    createdAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW }
},{tableName:"stocks",timestamps:true});

Stock.belongsTo(Product,{foreignKey:"product_id"});

module.exports = Stock;
