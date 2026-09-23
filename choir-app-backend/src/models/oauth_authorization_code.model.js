module.exports = (sequelize, Sequelize) => {
  // Short lived, single use authorization codes. Only the hash is stored.
  const OAuthAuthorizationCode = sequelize.define("oauth_authorization_code", {
    codeHash: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    clientId: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    redirectUri: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    codeChallenge: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    codeChallengeMethod: {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: 'S256',
    },
    scopes: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    },
    allowWrite: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    choirId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    resource: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    expiresAt: {
      type: Sequelize.DATE,
      allowNull: false,
    },
    usedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    // Set on exchange so a replay can revoke exactly the grant this code produced.
    issuedApiTokenId: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['codeHash'] },
      { fields: ['expiresAt'] },
    ]
  });

  return OAuthAuthorizationCode;
};
