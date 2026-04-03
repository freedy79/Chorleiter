module.exports = (sequelize, DataTypes) => {
    const PracticeList = sequelize.define('practice_list', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        targetDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        }
    }, {
        indexes: [
            { fields: ['userId'] },
            { fields: ['choirId'] },
            { fields: ['updatedAt'] }
        ]
    });

    return PracticeList;
};
