module.exports = (sequelize, DataTypes) => {
  const ChatMessageReaction = sequelize.define('chat_message_reaction', {
    emoji: {
      type: DataTypes.STRING(32),
      allowNull: false
    }
  }, {
    updatedAt: false,
    indexes: [
      { unique: true, fields: ['chatMessageId', 'userId', 'emoji'] },
      { fields: ['chatMessageId'] }
    ]
  });

  return ChatMessageReaction;
};
