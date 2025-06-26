module.exports = (sequelize, DataTypes) => {
    // We'll call it "Category" in the code for standard English naming.
    const Category = sequelize.define("category", {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true // Categories are global and unique
      }
    });
    return Category;
};