const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');
const ServiceItem = require('./ServiceItem');

const UserServiceCommitment = sequelize.define('UserServiceCommitment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
  },
  item_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'service_items', key: 'id' },
  },
  service_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  item_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12,2),
    allowNull: false,
  },
  day_of_month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 31 },
  },
  periodicity: {
    type: DataTypes.ENUM('mensuel', 'bimestriel', 'trimestriel', 'semestriel', 'annuel', 'ponctuel'),
    defaultValue: 'mensuel',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'user_service_commitments',
  timestamps: true,
});

UserServiceCommitment.belongsTo(User, { foreignKey: 'user_id' });
UserServiceCommitment.belongsTo(ServiceItem, { foreignKey: 'item_id', as: 'serviceItem' });

module.exports = UserServiceCommitment;