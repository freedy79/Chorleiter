module.exports = (sequelize, DataTypes) => {
    const PieceChange = sequelize.define('piece_change', {
        data: {
            type: DataTypes.JSON,
            allowNull: false
        }
    });
    return PieceChange;
};
