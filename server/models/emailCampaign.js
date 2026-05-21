module.exports = (sequelize, DataTypes) => {
  const EmailCampaign = sequelize.define('EmailCampaign', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Batches',
        key: 'id'
      }
    },
    subject: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    bodyTemplate: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    totalRecipients: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emailsSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emailsDelivered: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    emailsFailed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled']]
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
    tableName: 'email_campaigns',
    timestamps: true
  });

  EmailCampaign.associate = function(models) {
    EmailCampaign.belongsTo(models.Batch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    EmailCampaign.hasMany(models.EmailDeliveryLog, {
      foreignKey: 'campaignId',
      as: 'deliveryLogs'
    });
  };

  return EmailCampaign;
};