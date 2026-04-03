module.exports = (sequelize, DataTypes) => {
  const Poll = sequelize.define('poll', {
    allowMultiple: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    maxSelections: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    closesAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isAnonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  });
  return Poll;
};
