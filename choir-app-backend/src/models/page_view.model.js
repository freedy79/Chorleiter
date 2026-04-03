module.exports = (sequelize, DataTypes) => {
  const PageView = sequelize.define("page_view", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // The route/path visited (e.g. '/pieces/123', '/shared-piece/abc123')
    path: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    // Category for grouping: 'piece', 'collection', 'shared-piece', 'page'
    category: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'page'
    },
    // Reference to the entity (e.g. piece ID, collection ID)
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Human-readable label (e.g. piece title, page title)
    entityLabel: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    // Optional: share token for shared piece tracking
    shareToken: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    // User who accessed (null for anonymous/public access)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // Choir context (if applicable)
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // IP address (hashed for privacy)
    ipHash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    // User agent string
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    // Referrer (where the user came from)
    referrer: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'page_views',
    timestamps: false,
    indexes: [
      { fields: ['category'] },
      { fields: ['entityId'] },
      { fields: ['shareToken'] },
      { fields: ['userId'] },
      { fields: ['timestamp'] },
      { fields: ['category', 'entityId'] },
      { fields: ['category', 'timestamp'] }
    ]
  });

  return PageView;
};
