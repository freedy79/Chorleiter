module.exports = (sequelize, DataTypes) => {
  const District = sequelize.define('district', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  });
  return District;
};
