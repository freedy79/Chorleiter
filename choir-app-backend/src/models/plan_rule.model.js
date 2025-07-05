module.exports = (sequelize, DataTypes) => {
    const PlanRule = sequelize.define('plan_rule', {
        type: {
            type: DataTypes.ENUM('REHEARSAL', 'SERVICE'),
            allowNull: false
        },
        dayOfWeek: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        weeks: {
            type: DataTypes.JSON,
            allowNull: true
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });
    return PlanRule;
};
