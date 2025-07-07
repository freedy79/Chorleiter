module.exports = (sequelize, DataTypes) => {
    const ChoirRepertoire = sequelize.define("choir_repertoire", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('CAN_BE_SUNG', 'IN_REHEARSAL', 'NOT_READY'),
            defaultValue: 'NOT_READY'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    });
    return ChoirRepertoire;
};