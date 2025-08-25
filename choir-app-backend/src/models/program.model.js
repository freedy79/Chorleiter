module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('program', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'choir_id',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    startTime: {
      type: DataTypes.DATE,
      field: 'start_time',
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
      type: DataTypes.INTEGER,
      field: 'published_from_id',
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'created_by',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
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
