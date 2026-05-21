module.exports = (sequelize, DataTypes) => {
  const Participant = sequelize.define('Participant', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    srNo: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    certificateId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Batches',
        key: 'id'
      }
    },
    certificatePath: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    cloudUrl: {
      type: DataTypes.STRING(500),
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
    tableName: 'participants',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['certificateId']
      },
      {
        fields: ['batchId']
      },
      {
        fields: ['email']
      }
    ]
  });

  Participant.associate = function(models) {
    Participant.belongsTo(models.Batch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
    Participant.hasMany(models.EmailDeliveryLog, {
      foreignKey: 'participantId',
      as: 'emailLogs'
    });
  };

  return Participant;
};