module.exports = (sequelize, DataTypes) => {
    const TheoryTopic = sequelize.define("theory_topic", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        key: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: { isIn: [['grundlagen', 'tonhoehen_rhythmen', 'tonleitern_intervalle', 'harmonien_akkorde', 'anhang']] }
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        // Markdown content
        content: {
            type: DataTypes.TEXT('long'),
            allowNull: false
        },
        // Optional list of related exercise types/modules for cross-linking
        relatedExercises: {
            type: DataTypes.JSON,
            allowNull: true
        },
        orderIndex: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        indexes: [
            { unique: true, fields: ['key'] }
        ]
    });
    return TheoryTopic;
};
