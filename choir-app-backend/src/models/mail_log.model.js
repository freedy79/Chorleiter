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
    }
  });
  return MailLog;
};
