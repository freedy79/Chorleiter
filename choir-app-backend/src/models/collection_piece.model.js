module.exports = (sequelize, DataTypes) => {
    // This model represents the "link" between a Collection and a Piece.
    const CollectionPiece = sequelize.define("collection_piece", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        // This is the new, crucial field!
        numberInCollection: {
            type: DataTypes.STRING, // Using STRING to allow "23a", "p. 45", etc.
            allowNull: false
        }
    });
    return CollectionPiece;
};