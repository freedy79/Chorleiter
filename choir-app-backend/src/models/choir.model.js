module.exports = (sequelize, DataTypes) => {
    const Choir = sequelize.define("choir", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
       description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      location: { // Ort
        type: DataTypes.STRING,
        allowNull: true
      }
    });
    return Choir;
};
