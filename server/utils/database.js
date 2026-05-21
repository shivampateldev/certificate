const { sequelize } = require('../models');

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

/**
 * Sync database models (for development)
 */
async function syncDatabase(force = false) {
  try {
    await sequelize.sync({ force });
    console.log('Database synchronized successfully.');
    return true;
  } catch (error) {
    console.error('Error synchronizing database:', error);
    return false;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

module.exports = {
  testConnection,
  syncDatabase,
  closeConnection,
  sequelize
};