module.exports = (sequelize, DataTypes) => {
  const Donation = sequelize.define('donation', {
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    donatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
  return Donation;
};
