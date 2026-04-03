module.exports = (sequelize, DataTypes) => {
    const PracticeListItem = sequelize.define('practice_list_item', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderIndex: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isPinnedOffline: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    }, {
        indexes: [
            { fields: ['practiceListId'] },
            { fields: ['pieceId'] },
            { fields: ['pieceLinkId'] },
            { fields: ['isPinnedOffline'] },
            { fields: ['practiceListId', 'orderIndex'] },
            {
                unique: true,
                fields: ['practiceListId', 'pieceId', 'pieceLinkId']
            }
        ]
    });

    return PracticeListItem;
};
