const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const bcrypt = require('bcrypt');

const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('admin', 'superadmin'),
        defaultValue: 'admin'
    }
}, {
    tableName: 'admins',
    timestamps: true
});

// Hashage du mot de passe avant création
Admin.beforeCreate(async (admin) => {
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);
});

// Méthode pour vérifier le mot de passe
Admin.prototype.verifyPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = Admin;