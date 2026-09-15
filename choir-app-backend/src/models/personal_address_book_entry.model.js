module.exports = (sequelize, DataTypes) => {
    const PersonalAddressBookEntry = sequelize.define('personal_address_book_entry', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        firstName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false
        },
        normalizedEmail: {
            type: DataTypes.STRING,
            allowNull: false
        }
    }, {
        indexes: [
            { fields: ['userId'] },
            { fields: ['choirId'] },
            { unique: true, fields: ['userId', 'choirId', 'normalizedEmail'] }
        ]
    });

    return PersonalAddressBookEntry;
};
