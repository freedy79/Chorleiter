// src/models/piece_link.model.js
module.exports = (sequelize, DataTypes) => {
    const PieceLink = sequelize.define("piece_link", {
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        url: {
            type: DataTypes.STRING,
            allowNull: false
        },
        downloadName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('EXTERNAL', 'FILE_DOWNLOAD'),
            defaultValue: 'EXTERNAL'
        }
    });
    return PieceLink;
};
