module.exports = (sequelize, DataTypes) => {
    const Piece = sequelize.define("piece", {
        title: {
            type: DataTypes.STRING,
            allowNull: false
        },
        voicing: {
            type: DataTypes.STRING,
            allowNull: true
        },
        key: { // Tonart
            type: DataTypes.STRING,
            allowNull: true
        },
        timeSignature: { // Takt
            type: DataTypes.STRING,
            allowNull: true
        },
        lyrics: { // Text
            type: DataTypes.TEXT,
            allowNull: true
        },
        imageIdentifier: { // Grafik (stores filename or a UUID)
            type: DataTypes.STRING,
            allowNull: true
        },
        license: { // Lizenz
            type: DataTypes.STRING,
            allowNull: true
        },
        opus: { // Opus- / Verzeichniszahl
            type: DataTypes.STRING,
            allowNull: true
        },
        lyricsSource: { // Sonstige Quelle für den Text
            type: DataTypes.STRING,
            allowNull: true
        }
    });
    return Piece;
};
