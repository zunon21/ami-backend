const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserCommitment = sequelize.define('UserCommitment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        unique: true
    },
    amount: {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false
    },
    day_of_month: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 31 }
    },
    periodicity: {
        type: DataTypes.ENUM('mensuel', 'bimestriel', 'trimestriel', 'semestriel', 'annuel'),
        defaultValue: 'mensuel'
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'user_commitments',
    timestamps: true
});

module.exports = UserCommitment;