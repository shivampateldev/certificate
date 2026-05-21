'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('certificate_id_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      certificateId: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      generatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      batchId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'batches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      eventPrefix: {
        type: Sequelize.STRING(10),
        defaultValue: 'SOU'
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
    await queryInterface.addIndex('certificate_id_logs', ['certificateId']);
    await queryInterface.addIndex('certificate_id_logs', ['batchId']);
    await queryInterface.addIndex('certificate_id_logs', ['generatedAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('certificate_id_logs');
  }
};