module.exports = (sequelize, DataTypes) => {
  const Congregation = sequelize.define('congregation', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    districtId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });
  return Congregation;
};
