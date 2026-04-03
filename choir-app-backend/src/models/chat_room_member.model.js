module.exports = (sequelize, DataTypes) => {
  const ChatRoomMember = sequelize.define('chat_room_member', {
    role: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'member'
    }
  }, {
    indexes: [
      { unique: true, fields: ['chatRoomId', 'userId'] },
      { fields: ['userId'] }
    ]
  });

  return ChatRoomMember;
};
