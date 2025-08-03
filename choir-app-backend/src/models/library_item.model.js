module.exports = (sequelize, DataTypes) => {
  const LibraryItem = sequelize.define('library_item', {
    pieceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    copies: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    status: {
      type: DataTypes.ENUM('available', 'borrowed'),
      defaultValue: 'available'
    },
    availableAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });
  return LibraryItem;
};
