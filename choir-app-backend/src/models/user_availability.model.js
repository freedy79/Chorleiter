module.exports = (sequelize, DataTypes) => {
    const UserAvailability = sequelize.define('user_availability', {
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('AVAILABLE', 'MAYBE', 'UNAVAILABLE'),
            allowNull: false,
            defaultValue: 'AVAILABLE'
        }
    });
    return UserAvailability;
};
