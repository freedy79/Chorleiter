const ALLOWED_CHOIR_ROLES = ['director', 'choir_admin', 'organist', 'singer'];

function normalizeChoirRoles(value) {
    if (!Array.isArray(value)) {
        return value;
    }

    const normalized = value
        .filter(role => role != null)
        .map(role => {
            if (typeof role !== 'string') {
                return role;
            }

            const lower = role.toLowerCase();
            if (lower === 'chorleiter' || lower === 'choirleiter') {
                return 'director';
            }

            if (ALLOWED_CHOIR_ROLES.includes(lower)) {
                return lower;
            }

            return role;
        });

    return Array.from(new Set(normalized));
}

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
            defaultValue: ['director'],
            validate: {
                isValidRole(value) {
                    const normalized = normalizeChoirRoles(value);
                    if (!Array.isArray(normalized) || !normalized.every(r => ALLOWED_CHOIR_ROLES.includes(r))) {
                        throw new Error('Invalid choir role');
                    }
                }
            },
            set(value) {
                const normalized = Array.isArray(value) ? normalizeChoirRoles(value) : value;
                this.setDataValue('rolesInChoir', normalized);
            },
            get() {
                const value = this.getDataValue('rolesInChoir');
                return Array.isArray(value) ? normalizeChoirRoles(value) : value;
            }
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
