module.exports = (sequelize, DataTypes) => {
  const MissingEventReminderLog = sequelize.define('missing_event_reminder_log', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    planEntryId: {
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
        fields: ['userId', 'planEntryId', 'reminderType']
      }
    ]
  });

  return MissingEventReminderLog;
};
