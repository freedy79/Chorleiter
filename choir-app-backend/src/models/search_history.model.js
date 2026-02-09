module.exports = (sequelize, DataTypes) => {
  const SearchHistory = sequelize.define("search_history", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    query: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    filterData: {
      type: DataTypes.JSON,
      allowNull: true
    },
    resultCount: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    clickedResultId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    clickedResultType: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'search_histories',
    timestamps: false,
    indexes: [
      {
        fields: ['userId', 'timestamp']
      },
      {
        fields: ['query']
      }
    ]
  });

  return SearchHistory;
};
