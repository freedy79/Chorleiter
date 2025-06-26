module.exports = (sequelize, DataTypes) => {
    const EventPieces = sequelize.define("event_pieces", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        }
    });
    return EventPieces;
};