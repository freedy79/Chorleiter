module.exports = (sequelize, DataTypes) => {
  const ReferralInvitation = sequelize.define('referral_invitation', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    senderUserId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    recipientName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    recipientEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    invitationType: {
      type: DataTypes.ENUM('singer', 'choir-admin'),
      allowNull: false,
      defaultValue: 'choir-admin'
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    requestedByIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    indexes: [
      { fields: ['senderUserId'] },
      { fields: ['recipientEmail'] },
      { fields: ['expiresAt'] },
      { fields: ['invitationType'] }
    ]
  });

  return ReferralInvitation;
};
