module.exports = (sequelize, DataTypes) => {
  const PollVoteReminderToken = sequelize.define('poll_vote_reminder_token', {
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    invalidatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      { fields: ['pollId', 'userId'] },
      { fields: ['expiresAt'] }
    ]
  });

  return PollVoteReminderToken;
};
