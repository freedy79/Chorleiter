module.exports = (sequelize, DataTypes) => {
  const MailTemplate = sequelize.define('mail_template', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING, allowNull: false, unique: true },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT('long'), allowNull: false }
  });
  return MailTemplate;
};
