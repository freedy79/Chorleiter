module.exports = (sequelize, DataTypes) => {
    const Event = sequelize.define("event", {
      date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('REHEARSAL', 'SERVICE'),
        allowNull: false
      },
      notes: {
        type: DataTypes.TEXT
      },
      organistId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      finalized: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1
      },
      monthlyPlanId: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    });
    return Event;
};
