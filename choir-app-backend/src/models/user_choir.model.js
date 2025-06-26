module.exports = (sequelize, DataTypes) => {
    const UserChoir = sequelize.define("user_choir", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        // Diese Rolle ist spezifisch für die Beziehung zwischen User und Choir
        roleInChoir: {
            type: DataTypes.ENUM('director', 'choir_admin'),
            defaultValue: 'director'
        }
    });
    return UserChoir;
};
