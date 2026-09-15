module.exports = (sequelize, DataTypes) => {
  const MailLog = sequelize.define('mail_log', {
    recipients: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'SENT'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    triggerUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    triggerChoirId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    triggerSource: {
      type: DataTypes.STRING,
      allowNull: true
    },
    triggerAction: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });
  return MailLog;
};
