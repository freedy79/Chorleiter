module.exports = (sequelize, DataTypes) => {
    const ChoirLog = sequelize.define('choir_log', {
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        details: {
            type: DataTypes.JSON,
            allowNull: true
        }
    });
    return ChoirLog;
};
