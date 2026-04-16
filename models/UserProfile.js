const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const UserProfile = sequelize.define('UserProfile', {
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
    first_name: { type: DataTypes.STRING(100), allowNull: true },
    gender: { type: DataTypes.ENUM('Homme', 'Femme'), allowNull: true },
    age: { type: DataTypes.INTEGER, allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    profession: { type: DataTypes.STRING(100), allowNull: true },
    church_org: { type: DataTypes.STRING(150), allowNull: true }
}, {
    tableName: 'user_profiles',
    timestamps: true
});

module.exports = UserProfile;