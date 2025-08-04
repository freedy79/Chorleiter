module.exports = (sequelize, DataTypes) => {
  const LoanRequest = sequelize.define('loan_request', {
    startDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });
  return LoanRequest;
};
