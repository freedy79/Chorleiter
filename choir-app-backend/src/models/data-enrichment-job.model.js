module.exports = (sequelize, DataTypes) => {
    const DataEnrichmentJob = sequelize.define('data_enrichment_job', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        jobType: {
            type: DataTypes.ENUM('piece', 'composer', 'publisher'),
            allowNull: false,
            comment: 'Type of entity being enriched'
        },
        status: {
            type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending'
        },
        totalItems: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Total number of items to process'
        },
        processedItems: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of items successfully processed'
        },
        successCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of items with successful suggestions'
        },
        errorCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of items that failed during processing'
        },
        skippedCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Number of items skipped (already enriched, etc.)'
        },
        llmProvider: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'gemini',
            comment: 'Which LLM provider was used (gemini, claude, openai, etc.)'
        },
        apiCosts: {
            type: DataTypes.DECIMAL(10, 6),
            allowNull: false,
            defaultValue: 0,
            comment: 'Total API costs for this job in USD'
        },
        startedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        completedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        errorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Error details if job failed'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {},
            comment: 'Additional metadata (filters, options, etc.)'
        },
        createdBy: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['status'] },
            { fields: ['jobType'] },
            { fields: ['createdAt'] },
            { fields: ['createdBy'] }
        ]
    });

    return DataEnrichmentJob;
};
