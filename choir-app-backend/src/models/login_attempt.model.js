module.exports = (sequelize, DataTypes) => {
    const LoginAttempt = sequelize.define("login_attempt", {
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        success: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        ipAddress: {
            type: DataTypes.STRING
        },
        userAgent: {
            type: DataTypes.STRING
        }
    });
    return LoginAttempt;
};
