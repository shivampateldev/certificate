module.exports = (sequelize, DataTypes) => {
  const EmailDeliveryLog = sequelize.define('EmailDeliveryLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    campaignId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'EmailCampaigns',
        key: 'id'
      }
    },
    participantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Participants',
        key: 'id'
      }
    },
    emailAddress: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    deliveryStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['sent', 'delivered', 'bounced', 'failed', 'complained']]
      }
    },
    deliveryTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sesMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true
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
    tableName: 'email_delivery_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['campaignId']
      },
      {
        fields: ['participantId']
      },
      {
        fields: ['deliveryStatus']
      }
    ]
  });

  EmailDeliveryLog.associate = function(models) {
    EmailDeliveryLog.belongsTo(models.EmailCampaign, {
      foreignKey: 'campaignId',
      as: 'campaign'
    });
    EmailDeliveryLog.belongsTo(models.Participant, {
      foreignKey: 'participantId',
      as: 'participant'
    });
  };

  return EmailDeliveryLog;
};