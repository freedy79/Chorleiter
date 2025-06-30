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
        type: DataTypes.ENUM('director', 'choir_admin', 'admin', 'demo'),
        defaultValue: 'director'
      },
      lastDonation: {
        type: DataTypes.DATE,
        allowNull: true
      },
      preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
      }
    });
    return User;
};
