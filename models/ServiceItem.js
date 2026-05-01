const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const ServiceCategory = require('./ServiceCategory');

const ServiceItem = sequelize.define('ServiceItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  category_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: ServiceCategory,
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'service_items',
  timestamps: true,
});

ServiceItem.belongsTo(ServiceCategory, { foreignKey: 'category_id', as: 'category' });
ServiceCategory.hasMany(ServiceItem, { foreignKey: 'category_id', as: 'items' });

module.exports = ServiceItem;