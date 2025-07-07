module.exports = (sequelize, DataTypes) => {
    const PieceNote = sequelize.define('piece_note', {
        text: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    });
    return PieceNote;
};
