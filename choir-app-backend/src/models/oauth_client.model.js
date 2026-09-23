module.exports = (sequelize, Sequelize) => {
  // Public clients registered via RFC 7591 dynamic client registration.
  // No client secret is ever issued - PKCE is mandatory instead.
  const OAuthClient = sequelize.define("oauth_client", {
    clientId: {
      type: Sequelize.STRING(64),
      allowNull: false,
    },
    clientName: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    redirectUris: {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: [],
    },
    clientUri: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    lastUsedAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    disabledAt: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  }, {
    indexes: [
      { unique: true, fields: ['clientId'] },
    ]
  });

  return OAuthClient;
};
