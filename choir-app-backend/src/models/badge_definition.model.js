module.exports = (sequelize, DataTypes) => {
    const BadgeDefinition = sequelize.define("badge_definition", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'emoji_events'
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [['streak', 'xp', 'module', 'community', 'mission']] }
        },
        condition: {
            type: DataTypes.JSON,
            allowNull: false
        },
        xpBonus: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        orderIndex: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        indexes: [
            { unique: true, fields: ['key'] }
        ]
    });
    return BadgeDefinition;
};
