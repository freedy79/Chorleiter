module.exports = (sequelize, DataTypes) => {
  const LoanRequestItem = sequelize.define('loan_request_item', {
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  });
  return LoanRequestItem;
};
