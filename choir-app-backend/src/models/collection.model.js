module.exports = (sequelize, DataTypes) => {
    const Collection = sequelize.define("collection", {
        title: { type: DataTypes.STRING, allowNull: false, unique: true },
        publisher: { type: DataTypes.STRING },
        prefix: { type: DataTypes.STRING }, // e.g., "GL", "EG"
        description: { type: DataTypes.TEXT },
        publisherNumber: { type: DataTypes.STRING },
        // true if this collection represents a single edition (only one piece)
        singleEdition: { type: DataTypes.BOOLEAN, defaultValue: false },
        // Optional filename of the uploaded cover image
        coverImage: { type: DataTypes.STRING }
    });
    return Collection;
};
