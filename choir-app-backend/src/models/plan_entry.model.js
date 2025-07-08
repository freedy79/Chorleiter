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
    });
    return PlanEntry;
};
