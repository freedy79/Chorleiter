module.exports = (sequelize, DataTypes) => {
    const PlanEntry = sequelize.define('plan_entry', {
        date: {
            type: DataTypes.DATE,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('REHEARSAL', 'SERVICE'),
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });
    return PlanEntry;
};
