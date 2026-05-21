module.exports = (sequelize, DataTypes) => {
  const CertificateIdLog = sequelize.define('CertificateIdLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    certificateId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Batches',
        key: 'id'
      }
    },
    eventPrefix: {
      type: DataTypes.STRING(10),
      defaultValue: 'SOU'
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
    tableName: 'certificate_id_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['certificateId']
      },
      {
        fields: ['batchId']
      },
      {
        fields: ['generatedAt']
      }
    ]
  });

  CertificateIdLog.associate = function(models) {
    CertificateIdLog.belongsTo(models.Batch, {
      foreignKey: 'batchId',
      as: 'batch'
    });
  };

  return CertificateIdLog;
};