module.exports = (sequelize, DataTypes) => {
  const SystemSetting = sequelize.define('system_setting', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING }
  });
  return SystemSetting;
};
