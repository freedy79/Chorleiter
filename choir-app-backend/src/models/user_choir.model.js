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
            type: DataTypes.ENUM('director', 'choir_admin', 'organist'),
            defaultValue: 'director'
        },
        isOrganist: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
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
