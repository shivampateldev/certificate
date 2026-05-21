'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_delivery_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      campaignId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'email_campaigns',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participantId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'participants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      emailAddress: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      deliveryStatus: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      deliveryTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sesMessageId: {
        type: Sequelize.STRING(255),
        allowNull: true
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
    await queryInterface.addIndex('email_delivery_logs', ['campaignId']);
    await queryInterface.addIndex('email_delivery_logs', ['participantId']);
    await queryInterface.addIndex('email_delivery_logs', ['deliveryStatus']);
    await queryInterface.addIndex('email_delivery_logs', ['deliveryTime']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('email_delivery_logs');
  }
};