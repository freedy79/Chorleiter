module.exports = (sequelize, DataTypes) => {
    const MonthlyPlanRecipientPreference = sequelize.define('monthly_plan_recipient_preference', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        selectedUserIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },
        selectedAddressBookEntryIds: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        }
    }, {
        indexes: [
            { fields: ['userId'] },
            { fields: ['choirId'] },
            { unique: true, fields: ['userId', 'choirId'] }
        ]
    });

    return MonthlyPlanRecipientPreference;
};
