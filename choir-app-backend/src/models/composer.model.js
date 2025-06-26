module.exports = (sequelize, DataTypes) => {
    const Composer = sequelize.define("composer", {
      name: {
        type: DataTypes.STRING,
        allowNull: false
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
    
    return Composer;
};