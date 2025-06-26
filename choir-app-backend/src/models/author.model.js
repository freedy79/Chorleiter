// src/models/author.model.js
module.exports = (sequelize, DataTypes) => {
    const Author = sequelize.define("author", {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      birthYear: {
        type: DataTypes.STRING,
        allowNull: true
      },
      deathYear: {
        type: DataTypes.STRING,
        allowNull: true
      }
    });
    return Author;
};
