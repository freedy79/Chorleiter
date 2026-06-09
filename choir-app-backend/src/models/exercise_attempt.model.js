module.exports = (sequelize, DataTypes) => {
    const ExerciseAttempt = sequelize.define("exercise_attempt", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        score: {
            type: DataTypes.FLOAT,
            allowNull: false,
            validate: { min: 0, max: 100 }
        },
        accuracy: {
            type: DataTypes.FLOAT,
            allowNull: true,
            validate: { min: 0, max: 100 }
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Duration in seconds'
        },
        xpEarned: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        completedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        details: {
            type: DataTypes.JSON,
            allowNull: true
        }
    });
    return ExerciseAttempt;
};
