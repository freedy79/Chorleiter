module.exports = (sequelize, Sequelize) => {
  const ChatMessageReport = sequelize.define('chat_message_report', {
    reason: {
      type: Sequelize.TEXT,
      allowNull: false
    },
    status: {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'pending'
    },
    resolvedAt: {
      type: Sequelize.DATE,
      allowNull: true
    },
    resolvedByUserId: {
      type: Sequelize.INTEGER,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      { fields: ['chatMessageId'] },
      { fields: ['reporterUserId'] },
      { fields: ['status'] }
    ]
  });

  return ChatMessageReport;
};
