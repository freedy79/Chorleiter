module.exports = (sequelize, DataTypes) => {
    const DataEnrichmentSetting = sequelize.define('data_enrichment_setting', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        settingKey: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            comment: 'Configuration key (e.g., "llm_provider", "budget_monthly", "api_key_gemini")'
        },
        settingValue: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Configuration value (may be encrypted for API keys)'
        },
        isEncrypted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Whether this value is encrypted (True for API keys)'
        },
        dataType: {
            type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
            allowNull: false,
            defaultValue: 'string'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        lastModifiedBy: {
            type: DataTypes.UUID,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['settingKey'] }
        ]
    });

    return DataEnrichmentSetting;
};
