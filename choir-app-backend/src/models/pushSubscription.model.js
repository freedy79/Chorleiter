module.exports = (sequelize, DataTypes) => {
  const PushSubscription = sequelize.define('push_subscription', {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keys: {
      type: DataTypes.JSON,
      allowNull: false
    }
  }, {
    indexes: [
      {
        unique: true,
        fields: ['userId', 'choirId', 'endpoint']
      }
    ]
  });
  return PushSubscription;
};
