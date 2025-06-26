module.exports = (sequelize, DataTypes) => {
    const Collection = sequelize.define("collection", {
        title: { type: DataTypes.STRING, allowNull: false, unique: true },
        publisher: { type: DataTypes.STRING },
        prefix: { type: DataTypes.STRING } // e.g., "GL", "EG"
    });
    return Collection;
};