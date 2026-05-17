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
        allowNull: true,  // Changement : false → true
        // references: { model: 'users', key: 'id' }  // commenté pour les tests
    },
    project_id: {
        type: DataTypes.UUID,
        allowNull: true,  // Changement : false → true
        // references: { model: 'projects', key: 'id' }  // commenté car la table projects n'existe pas encore
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
    },
    payment_method: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'wave, orange, mtn, moov, djamo'
    },
    extra_data: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Stockage des infos supplémentaires (organisation, destinations, etc.)'
    }
}, {
    tableName: 'donations',
    timestamps: true
});

module.exports = Donation;