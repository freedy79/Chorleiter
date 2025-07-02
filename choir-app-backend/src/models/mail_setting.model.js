module.exports = (sequelize, DataTypes) => {
  const MailSetting = sequelize.define('mail_setting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    host: { type: DataTypes.STRING, allowNull: false },
    port: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 587 },
    user: { type: DataTypes.STRING, allowNull: true },
    pass: { type: DataTypes.STRING, allowNull: true },
    secure: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    fromAddress: { type: DataTypes.STRING, allowNull: true }
  });
  return MailSetting;
};
