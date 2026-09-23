module.exports = (sequelize, Sequelize) => {
  const ChoirApiToken = sequelize.define("choir_api_token", {
    choirId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    createdByUserId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    label: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    // SHA-256 of the plaintext token; the plaintext itself is never stored.
    tokenHash: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    tokenPrefix: {
      type: Sequelize.STRING(24),
      allowNull: false,
    },
    scopes: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    },
    // Redundant hard switch next to the scope, so a scope bug alone cannot enable writes.
    allowWrite: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    lastUsedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    lastUsedIp: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    usageCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    writeCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    renewedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    renewCount: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    expiryNotifiedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    revokedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    revokedByUserId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      { fields: ['choirId'] },
      { fields: ['expiresAt'] },
    ]
  });

  return ChoirApiToken;
};
