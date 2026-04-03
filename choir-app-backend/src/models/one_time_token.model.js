module.exports = (sequelize, Sequelize) => {
  const OneTimeToken = sequelize.define("one_time_token", {
    token: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    createdByUserId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    targetUserId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    usedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    usedByIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    label: {
      type: Sequelize.STRING,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['token'] }
    ]
  });

  return OneTimeToken;
};
