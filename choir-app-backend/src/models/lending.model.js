module.exports = (sequelize, DataTypes) => {
  const Lending = sequelize.define('lending', {
    copyNumber: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    borrowerName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    borrowedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('available', 'borrowed'),
      defaultValue: 'available'
    }
  });
  return Lending;
};
