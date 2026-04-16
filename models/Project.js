const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    type: {
        type: DataTypes.ENUM('project', 'missionary', 'zone', 'general'),
        defaultValue: 'project'
    },
    target_amount: {
        type: DataTypes.DECIMAL(12,2),
        allowNull: true
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'projects',
    timestamps: true
});

module.exports = Project;