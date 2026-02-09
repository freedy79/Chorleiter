module.exports = (sequelize, DataTypes) => {
  const PhysicalCopy = sequelize.define('physical_copy', {
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    vendor: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    condition: {
      type: DataTypes.ENUM('new', 'good', 'worn', 'damaged'),
      allowNull: true
    }
  });
  return PhysicalCopy;
};
