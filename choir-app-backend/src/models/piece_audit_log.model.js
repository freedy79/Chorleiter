module.exports = (sequelize, DataTypes) => {
    const PieceAuditLog = sequelize.define("piece_audit_log", {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        pieceId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        choirId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        action: {
            type: DataTypes.ENUM('MERGED', 'DELETED'),
            allowNull: false
        },
        // For MERGED actions: the piece that was kept
        targetId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // For MERGED actions: the piece that was deleted
        sourceId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        // Admin user who performed the action
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        // JSON snapshot of the deleted/merged piece data (for audit trail)
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Stores piece data before deletion/merge for audit purposes'
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'piece_audit_logs',
        timestamps: false,
        indexes: [
            { fields: ['pieceId'] },
            { fields: ['choirId'] },
            { fields: ['action'] },
            { fields: ['createdAt'] },
            { fields: ['userId'] }
        ]
    });

    return PieceAuditLog;
};
