module.exports = (sequelize, DataTypes) => {
  const ChatRoom = sequelize.define('chat_room', {
    key: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    indexes: [
      { unique: true, fields: ['choirId', 'key'] },
      { fields: ['choirId'] }
    ]
  });

  return ChatRoom;
};
