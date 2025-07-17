module.exports = (sequelize, DataTypes) => {
    const Publisher = sequelize.define("publisher", {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        }
    });
    return Publisher;
};
