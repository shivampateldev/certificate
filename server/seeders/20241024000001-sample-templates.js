'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('templates', [
      {
        name: 'IEEE Technical Workshop Certificate',
        description: 'Standard certificate template for technical workshops and coding sessions',
        categories: JSON.stringify(['Technical', 'STEM']),
        filePath: 'templates/ieee-technical-workshop.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 24,
          fontFamily: 'Arial',
          colors: {
            primary: '#1976d2',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Leadership Development Certificate',
        description: 'Certificate template for leadership and soft skills workshops',
        categories: JSON.stringify(['Non-technical']),
        filePath: 'templates/leadership-development.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 22,
          fontFamily: 'Times New Roman',
          colors: {
            primary: '#2e7d32',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Spiritual Development Certificate',
        description: 'Certificate for religious and spiritual development activities',
        categories: JSON.stringify(['Spiritual']),
        filePath: 'templates/spiritual-development.pdf',
        templateData: JSON.stringify({
          layout: 'portrait',
          fontSize: 20,
          fontFamily: 'Georgia',
          colors: {
            primary: '#7b1fa2',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Administrative Excellence Certificate',
        description: 'Certificate for organizational and administrative achievements',
        categories: JSON.stringify(['Administrative']),
        filePath: 'templates/administrative-excellence.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 24,
          fontFamily: 'Arial',
          colors: {
            primary: '#f57c00',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Community Service Certificate',
        description: 'Certificate for humanitarian and community service activities',
        categories: JSON.stringify(['Humanitarian']),
        filePath: 'templates/community-service.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 22,
          fontFamily: 'Arial',
          colors: {
            primary: '#d32f2f',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'STEM Excellence Certificate',
        description: 'Certificate for Science, Technology, Engineering, and Mathematics achievements',
        categories: JSON.stringify(['STEM', 'Technical']),
        filePath: 'templates/stem-excellence.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 24,
          fontFamily: 'Arial',
          colors: {
            primary: '#1976d2',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Multi-Category Event Certificate',
        description: 'Versatile certificate template for events spanning multiple categories',
        categories: JSON.stringify(['Technical', 'Non-technical', 'STEM']),
        filePath: 'templates/multi-category-event.pdf',
        templateData: JSON.stringify({
          layout: 'landscape',
          fontSize: 23,
          fontFamily: 'Arial',
          colors: {
            primary: '#1976d2',
            secondary: '#333333'
          }
        }),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('templates', null, {});
  }
};