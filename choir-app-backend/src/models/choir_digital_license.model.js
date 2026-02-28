module.exports = (sequelize, DataTypes) => {
  const ChoirDigitalLicense = sequelize.define('choir_digital_license', {
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
    },
    documentPath: {
      type: DataTypes.STRING(512),
      allowNull: true
    },
    documentOriginalName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    documentMime: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    documentSize: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    indexes: [
      { fields: ['choirId', 'collectionId'] }
    ]
  });

  return ChoirDigitalLicense;
};
