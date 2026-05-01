const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Créer la table service_categories
    await queryInterface.createTable('service_categories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 2. Créer la table service_items
    await queryInterface.createTable('service_items', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'service_categories',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 3. Ajouter les colonnes item_id et is_archived à user_service_commitments
    await queryInterface.addColumn('user_service_commitments', 'item_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'service_items',
        key: 'id',
      },
    });
    await queryInterface.addColumn('user_service_commitments', 'is_archived', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // 4. Insérer les catégories existantes (avec ordre)
    const categories = [
      'Champs', 'Projets', 'IIFM', 'Missionnaire',
      'Départements', 'Activités', 'Social', 'Équipements', 'Zones'
    ];
    for (let i = 0; i < categories.length; i++) {
      await queryInterface.bulkInsert('service_categories', [{
        id: uuidv4(),
        name: categories[i],
        display_order: i,
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('user_service_commitments', 'is_archived');
    await queryInterface.removeColumn('user_service_commitments', 'item_id');
    await queryInterface.dropTable('service_items');
    await queryInterface.dropTable('service_categories');
  },
};