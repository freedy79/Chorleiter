// src/models/author.model.js
module.exports = (sequelize, DataTypes) => {
    const Author = sequelize.define("author", {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      }
    });
    return Author;
};
