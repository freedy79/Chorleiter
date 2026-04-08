module.exports = (sequelize, DataTypes) => {
    const UserBadge = sequelize.define("user_badge", {
        earnedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        indexes: [
            { unique: true, fields: ['userId', 'badgeDefinitionId'] }
        ]
    });
    return UserBadge;
};
