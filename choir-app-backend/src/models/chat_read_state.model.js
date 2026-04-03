module.exports = (sequelize, DataTypes) => {
  const ChatReadState = sequelize.define('chat_read_state', {
    lastReadMessageId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    indexes: [
      { unique: true, fields: ['chatRoomId', 'userId'] },
      { fields: ['userId'] }
    ]
  });

  return ChatReadState;
};
