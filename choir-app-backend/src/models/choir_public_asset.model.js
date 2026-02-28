module.exports = (sequelize, DataTypes) => {
    const ChoirPublicAsset = sequelize.define('choir_public_asset', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        choirPublicPageId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        filePath: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        mimeType: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        altText: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    }, {
        indexes: [
            { fields: ['choirPublicPageId'] },
            { fields: ['sortOrder'] },
        ],
    });

    return ChoirPublicAsset;
};
