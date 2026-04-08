module.exports = (sequelize, DataTypes) => {
  const ReminderLog = sequelize.define('reminder_log', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    daysBefore: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    reminderType: {
      type: DataTypes.ENUM('push', 'email'),
      allowNull: false
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'eventId', 'daysBefore', 'reminderType']
      }
    ]
  });

  return ReminderLog;
};
