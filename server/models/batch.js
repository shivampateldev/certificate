module.exports = (sequelize, DataTypes) => {
  const Batch = sequelize.define('Batch', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    eventCategories: {
      type: DataTypes.TEXT, // SQLite compatibility
      allowNull: false,
      defaultValue: '[]',
      get() {
        const value = this.getDataValue('eventCategories');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('eventCategories', JSON.stringify(value || []));
      }
    },
    templateId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Templates',
        key: 'id'
      }
    },
    totalParticipants: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    certificatesGenerated: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emailsSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    createdBy: {
      type: DataTypes.INTEGER,
      // Will reference Users table when implemented
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'completed', 'failed']]
      }
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
    tableName: 'batches',
    timestamps: true
  });

  Batch.associate = function(models) {
    Batch.hasMany(models.Participant, {
      foreignKey: 'batchId',
      as: 'participants'
    });
    Batch.belongsTo(models.Template, {
      foreignKey: 'templateId',
      as: 'template'
    });
    Batch.hasMany(models.EmailCampaign, {
      foreignKey: 'batchId',
      as: 'emailCampaigns'
    });
  };

  return Batch;
};