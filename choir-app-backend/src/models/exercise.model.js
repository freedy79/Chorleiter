module.exports = (sequelize, DataTypes) => {
    const Exercise = sequelize.define("exercise", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        module: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [['rhythm', 'note_reading', 'ear_training']] }
        },
        difficulty: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [['beginner', 'intermediate', 'advanced']] }
        },
        type: {
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
        content: {
            type: DataTypes.JSON,
            allowNull: false
        },
        xpReward: {
            type: DataTypes.INTEGER,
            defaultValue: 10
        },
        orderIndex: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    });
    return Exercise;
};
