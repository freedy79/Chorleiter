module.exports = (sequelize, Sequelize) => {
  // Refresh tokens are rotated on every use and are bound to the choir API
  // token that backs the grant, so revoking that token also kills the grant.
  const OAuthRefreshToken = sequelize.define("oauth_refresh_token", {
    tokenHash: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    clientId: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    choirApiTokenId: {
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
    revokedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['tokenHash'] },
      { fields: ['choirApiTokenId'] },
    ]
  });

  return OAuthRefreshToken;
};
