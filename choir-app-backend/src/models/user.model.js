module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define("user", {
      name: {
        type: DataTypes.STRING
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resetToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      resetTokenExpiry: {
        type: DataTypes.DATE,
        allowNull: true
      },
      role: {
        // Include 'singer' so regular choir members can register
        type: DataTypes.ENUM('director', 'choir_admin', 'admin', 'demo', 'singer', 'librarian'),
        defaultValue: 'director'
      },
      lastDonation: {
        type: DataTypes.DATE,
        allowNull: true
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true
      },
      street: {
        type: DataTypes.STRING,
        allowNull: true
      },
      postalCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shareWithChoir: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
      }
    });
    return User;
};
