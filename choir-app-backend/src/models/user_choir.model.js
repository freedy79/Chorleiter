module.exports = (sequelize, DataTypes) => {
    const UserChoir = sequelize.define("user_choir", {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        // Rollen eines Benutzers innerhalb eines Chors
        rolesInChoir: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: ['director']
        },
        registrationStatus: {
            type: DataTypes.ENUM('REGISTERED', 'PENDING'),
            defaultValue: 'REGISTERED'
        },
        inviteToken: {
            type: DataTypes.STRING,
            allowNull: true
        },
        inviteExpiry: {
            type: DataTypes.DATE,
            allowNull: true
        }
    });
    return UserChoir;
};
