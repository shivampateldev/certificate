module.exports = (sequelize, DataTypes) => {
  const GenerationJob = sequelize.define('GenerationJob', {
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    totalRecords: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    completedRecords: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending' // 'pending', 'processing', 'completed', 'failed'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    finishedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'generation_jobs',
    timestamps: true
  });

  GenerationJob.associate = function(models) {
    GenerationJob.belongsTo(models.Template, {
      foreignKey: 'templateId',
      as: 'template'
    });
  };

  return GenerationJob;
};
