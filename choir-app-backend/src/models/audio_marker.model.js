// src/models/audio_marker.model.js
module.exports = (sequelize, DataTypes) => {
    const AudioMarker = sequelize.define("audio_marker", {
        timeSec: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        label: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return AudioMarker;
};
