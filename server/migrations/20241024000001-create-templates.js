'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('templates', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      templateData: {
        type: Sequelize.TEXT, // SQLite doesn't support JSONB, use TEXT
        allowNull: true
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      categories: {
        type: Sequelize.TEXT, // SQLite doesn't support ARRAY, use TEXT with JSON
        allowNull: false,
        defaultValue: '[]'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('templates');
  }
};