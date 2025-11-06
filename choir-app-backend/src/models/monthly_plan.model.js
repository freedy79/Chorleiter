module.exports = (sequelize, DataTypes) => {
    const MonthlyPlan = sequelize.define('monthly_plan', {
        year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        month: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        finalized: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        version: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        }
    }, {
        indexes: [
            {
                name: 'monthly_plan_choir_year_month_unique',
                unique: true,
                fields: ['choirId', 'year', 'month']
            }
        ]
    });
    return MonthlyPlan;
};
