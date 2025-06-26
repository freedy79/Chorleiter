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
      }
    });
    return Event;
};