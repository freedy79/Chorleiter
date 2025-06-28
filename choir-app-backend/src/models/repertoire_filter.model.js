module.exports = (sequelize, DataTypes) => {
    const RepertoireFilter = sequelize.define('repertoire_filter', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        data: {
            type: DataTypes.JSON,
            allowNull: false
        },
        visibility: {
            type: DataTypes.ENUM('personal', 'local', 'global'),
            allowNull: false,
            defaultValue: 'personal'
        }
    });
    return RepertoireFilter;
};
