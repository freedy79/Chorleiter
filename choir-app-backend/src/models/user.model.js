module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("user", {
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
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
    pendingEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailChangeToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailChangeTokenExpiry: {
      type: DataTypes.DATE,
      allowNull: true
    },
    roles: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ['user'],
      validate: {
        isValidRole(value) {
          const allowed = ['admin', 'librarian', 'user', 'demo'];
          if (!Array.isArray(value) || !value.every(r => allowed.includes(r))) {
            throw new Error('Invalid role');
          }
        }
      }
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
    congregation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    voice: {
      type: DataTypes.ENUM('Sopran I', 'Sopran II', 'Alt I', 'Alt II', 'Tenor I', 'Tenor II', 'Bass I', 'Bass II'),
      allowNull: true
    },
    shareWithChoir: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    helpShown: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    preferences: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    }
  });
  return User;
};

