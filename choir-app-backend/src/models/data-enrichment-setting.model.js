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
            unique: true
        },
        settingValue: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isEncrypted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
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
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        }
    }, {
        timestamps: true,
        indexes: [
            { fields: ['settingKey'] }
        ]
    });

    return DataEnrichmentSetting;
};
