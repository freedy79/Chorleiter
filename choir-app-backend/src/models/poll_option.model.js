module.exports = (sequelize, DataTypes) => {
  const PollOption = sequelize.define('poll_option', {
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  });
  return PollOption;
};
