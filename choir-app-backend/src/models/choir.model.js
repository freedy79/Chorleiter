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
       location: {
        type: DataTypes.STRING,
        allowNull: true
       },
       modules: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {}
       }
      });
    return Choir;
};
