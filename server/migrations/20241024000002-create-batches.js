'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('batches', {
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
      eventCategories: {
        type: Sequelize.TEXT, // SQLite doesn't support ARRAY, use TEXT with JSON
        allowNull: false,
        defaultValue: '[]'
      },
      templateId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      totalParticipants: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      certificatesGenerated: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emailsSent: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'pending'
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

    // Add indexes
    await queryInterface.addIndex('batches', ['templateId']);
    await queryInterface.addIndex('batches', ['status']);
    await queryInterface.addIndex('batches', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('batches');
  }
};