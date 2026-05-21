'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_campaigns', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      batchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      bodyTemplate: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      totalRecipients: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emailsSent: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emailsDelivered: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      emailsFailed: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      scheduledAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: 'draft'
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
    await queryInterface.addIndex('email_campaigns', ['batchId']);
    await queryInterface.addIndex('email_campaigns', ['status']);
    await queryInterface.addIndex('email_campaigns', ['scheduledAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('email_campaigns');
  }
};