module.exports = (sequelize, DataTypes) => {
    const Composer = sequelize.define("composer", {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    });
    
    return Composer;
};