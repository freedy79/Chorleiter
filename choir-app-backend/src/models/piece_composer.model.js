module.exports = (sequelize, DataTypes) => {
    const PieceComposer = sequelize.define("piece_composer", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });
    return PieceComposer;
};
