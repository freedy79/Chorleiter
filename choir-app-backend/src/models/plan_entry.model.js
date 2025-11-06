module.exports = (sequelize, DataTypes) => {
    const PlanEntry = sequelize.define('plan_entry', {
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        indexes: [
            {
                name: 'plan_entry_monthly_plan_date',
                fields: ['monthlyPlanId', 'date']
            }
        ]
    });
    return PlanEntry;
};
