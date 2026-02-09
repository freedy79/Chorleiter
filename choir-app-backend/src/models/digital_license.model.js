module.exports = (sequelize, DataTypes) => {
  const DigitalLicense = sequelize.define('digital_license', {
    licenseNumber: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    licenseType: {
      type: DataTypes.ENUM('print', 'display', 'stream', 'archive'),
      allowNull: false,
      defaultValue: 'print'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true // null = unlimited
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
    validFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    validUntil: {
      type: DataTypes.DATEONLY,
      allowNull: true // null = unlimited
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });
  return DigitalLicense;
};
