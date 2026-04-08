module.exports = (sequelize, DataTypes) => {
    const TrainingProfile = sequelize.define("training_profile", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        activeModules: {
            type: DataTypes.JSON,
            defaultValue: ['rhythm', 'note_reading', 'ear_training']
        },
        totalXp: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        currentLevel: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        currentStreak: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        longestStreak: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastPracticeDate: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        weeklyGoalMinutes: {
            type: DataTypes.INTEGER,
            defaultValue: 15
        }
    }, {
        indexes: [
            { unique: true, fields: ['userId', 'choirId'] }
        ]
    });
    return TrainingProfile;
};
