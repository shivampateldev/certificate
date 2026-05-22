module.exports = (sequelize, DataTypes) => {
  const TemplateField = sequelize.define('TemplateField', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'templates',
        key: 'id'
      }
    },
    fieldName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    x: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    y: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fontFamily: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: 'Arial'
    },
    fontSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 24
    },
    fontWeight: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'normal'
    },
    fontColor: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: '#000000'
    },
    alignment: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'left'
    }
  }, {
    tableName: 'template_fields',
    timestamps: true
  });

  TemplateField.associate = function(models) {
    TemplateField.belongsTo(models.Template, {
      foreignKey: 'templateId',
      as: 'template'
    });
  };

  return TemplateField;
};
