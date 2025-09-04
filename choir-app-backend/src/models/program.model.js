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
      // Link to the original program this draft was created from.
      // The program ids use UUIDs, therefore this reference must also
      // be stored as a UUID. Using an integer here caused runtime errors
      // when attempting to create a revision of a published program
      // (for example when deleting an item) because the UUID could not
      // be persisted in an integer column. Changing the type fixes the
      // issue and allows revisions to be created correctly.
      type: DataTypes.UUID,
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
