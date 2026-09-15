module.exports = (sequelize, DataTypes) => {
    const PlanEntry = sequelize.define('plan_entry', {
        date: {
            type: DataTypes.DATE,
            allowNull: false
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
        },
        linkedEventId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'linked_event_id'
        },
        programId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'program_id'
        }
    }, {
        indexes: [
            {
                name: 'plan_entry_monthly_plan_date',
                fields: ['monthlyPlanId', 'date']
            },
            {
                name: 'plan_entry_linked_event_id',
                fields: ['linked_event_id']
            }
        ]
    });
    return PlanEntry;
};
