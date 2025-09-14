module.exports = (sequelize, DataTypes) => {
  const District = sequelize.define('district', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    code: {
      type: DataTypes.STRING,
      // Allow null temporarily so existing installations can backfill codes
      // before enforcing a NOT NULL constraint in a future migration
      allowNull: true,
      unique: true,
    },
  });
  return District;
};
