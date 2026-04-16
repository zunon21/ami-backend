const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Donation = sequelize.define('Donation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    project_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'projects', key: 'id' }
    },
    amount: {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false
    },
    is_anonymous: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        defaultValue: 'pending'
    },
    transaction_reference: {
        type: DataTypes.STRING(100),
        unique: true
    },
    donation_type: {
        type: DataTypes.ENUM('one_time', 'recurring'),
        defaultValue: 'one_time'
    }
}, {
    tableName: 'donations',
    timestamps: true
});

module.exports = Donation;