module.exports = (sequelize, DataTypes) => {
    const DataEnrichmentSuggestion = sequelize.define('data_enrichment_suggestion', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        jobId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'data_enrichment_jobs',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        entityType: {
            type: DataTypes.ENUM('piece', 'composer', 'publisher'),
            allowNull: false
        },
        entityId: {
            type: DataTypes.UUID,
            allowNull: false,
            comment: 'Reference to piece, composer, or publisher'
        },
        fieldName: {
            type: DataTypes.STRING,
            allowNull: false,
            comment: 'Field being suggested (e.g., "opus", "voicing", "duration")'
        },
        originalValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Current value in database (null if field is empty)'
        },
        suggestedValue: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: 'New value suggested by LLM'
        },
        confidence: {
            type: DataTypes.DECIMAL(3, 2),
            allowNull: false,
            defaultValue: 0.5,
            validate: { min: 0, max: 1 },
            comment: 'Confidence score 0-1 (higher = more confident)'
        },
        source: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Data source (IMSLP, Wikidata, MusicBrainz, etc.)'
        },
        reasoning: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'LLM explanation for the suggestion'
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'applied'),
            allowNull: false,
            defaultValue: 'pending'
        },
        reviewedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        reviewedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        },
        appliedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['jobId'] },
            { fields: ['entityType', 'entityId'] },
            { fields: ['status'] },
            { fields: ['confidence'] },
            { fields: ['createdAt'] }
        ]
    });

    return DataEnrichmentSuggestion;
};
