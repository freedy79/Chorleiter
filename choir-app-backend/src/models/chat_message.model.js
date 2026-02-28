module.exports = (sequelize, DataTypes) => {
  const ChatMessage = sequelize.define('chat_message', {
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    replyToMessageId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    attachmentFilename: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentOriginalName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentMimeType: {
      type: DataTypes.STRING,
      allowNull: true
    },
    attachmentSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    indexes: [
      { fields: ['chatRoomId', 'createdAt'] },
      { fields: ['chatRoomId', 'id'] },
      { fields: ['userId'] },
      { fields: ['replyToMessageId'] }
    ]
  });

  return ChatMessage;
};
