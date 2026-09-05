module.exports = (sequelize, DataTypes) => {
    const PlanRule = sequelize.define('plan_rule', {
        dayOfWeek: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        weeks: {
            type: DataTypes.JSON,
            allowNull: true
        },
        eventType: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'SERVICE',
            field: 'event_type'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });
    return PlanRule;
};
