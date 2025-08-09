module.exports = (sequelize, DataTypes) => {
  const LibraryItem = sequelize.define('library_item', {
    collectionId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    copies: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('available', 'requested', 'borrowed', 'due', 'partial_return'),
      defaultValue: 'available'
    },
    availableAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });
  return LibraryItem;
};
