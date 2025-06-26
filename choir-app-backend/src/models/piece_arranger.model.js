// src/models/piece_arranger.model.js
module.exports = (sequelize, DataTypes) => {
    const PieceArranger = sequelize.define("piece_arranger", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        }
    });
    return PieceArranger;
};
