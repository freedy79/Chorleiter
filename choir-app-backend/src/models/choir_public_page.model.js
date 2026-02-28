module.exports = (sequelize, DataTypes) => {
    const ChoirPublicPage = sequelize.define('choir_public_page', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        choirId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
        isEnabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isPublished: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        templateKey: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'classic',
        },
        headline: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        subheadline: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contentBlocks: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: [],
        },
        contactEmail: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        contactPhone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        websiteUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        seoTitle: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        seoDescription: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        ogImageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        publishedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        updatedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    }, {
        indexes: [
            { unique: true, fields: ['choirId'] },
            { unique: true, fields: ['slug'] },
            { fields: ['isEnabled', 'isPublished'] },
        ],
    });

    return ChoirPublicPage;
};
