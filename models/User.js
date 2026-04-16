const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    full_name: {
        type: DataTypes.STRING(100),
        allowNull: true   // permet de créer un utilisateur sans nom
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    anonymous_default: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'users',
    timestamps: true
});

// Associations
User.associate = (models) => {
    User.hasOne(models.UserCommitment, { foreignKey: 'user_id' });
    User.hasOne(models.UserProfile, { foreignKey: 'user_id' });
};

module.exports = User;