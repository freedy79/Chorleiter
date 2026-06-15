module.exports = (sequelize, DataTypes) => {
  const ChoirRegistrationRequest = sequelize.define('choir_registration_request', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    referralInvitationId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    requesterName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requesterEmail: {
      type: DataTypes.STRING,
      allowNull: false
    },
    requesterPhone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    choirName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    congregation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'),
      allowNull: false,
      defaultValue: 'PENDING_REVIEW'
    },
    emailVerificationCodeHash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    emailVerificationCodeExpiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verifiedByIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requestedByIp: {
      type: DataTypes.STRING,
      allowNull: true
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    approvedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    createdChoirId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    createdUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    indexes: [
      { fields: ['status'] },
      { fields: ['requesterEmail'] },
      { fields: ['choirName'] },
      { fields: ['emailVerificationCodeExpiresAt'] },
      { fields: ['referralInvitationId'] }
    ]
  });

  return ChoirRegistrationRequest;
};
