module.exports = (sequelize, DataTypes) => {
  const Template = sequelize.define('Template', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    templateData: {
      type: DataTypes.TEXT, // SQLite compatibility
      allowNull: true,
      get() {
        const value = this.getDataValue('templateData');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('templateData', value ? JSON.stringify(value) : null);
      }
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    categories: {
      type: DataTypes.TEXT, // SQLite compatibility
      allowNull: false,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('categories');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('categories', JSON.stringify(value || []));
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'templates',
    timestamps: true
  });

  Template.associate = function(models) {
    Template.hasMany(models.Batch, {
      foreignKey: 'templateId',
      as: 'batches'
    });
  };

  return Template;
};