module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('program', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    choirId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'choir_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    startAt: {
      type: DataTypes.DATE,
      field: 'start_at',
    },
    status: {
      type: DataTypes.ENUM('draft', 'published', 'archived'),
      defaultValue: 'draft',
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: 'published_at',
    },
    publishedFromId: {
      type: DataTypes.UUID,
      field: 'published_from_id',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'updated_by',
    },
  }, {
    tableName: 'programs',
    underscored: true,
    paranoid: true,
  });

  return Program;
};
