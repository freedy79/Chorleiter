module.exports = (sequelize, DataTypes) => {
  const DemoLead = sequelize.define('demo_lead', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    token: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    requestedIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verifiedIp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['email'] },
      { unique: true, fields: ['token'] },
    ],
  });

  return DemoLead;
};
