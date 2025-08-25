module.exports = (sequelize, DataTypes) => {
  const ProgramItem = sequelize.define('program_item', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    programId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'program_id',
    },
    sortIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sort_index',
    },
    type: {
      type: DataTypes.ENUM('piece', 'break', 'speech', 'slot'),
      allowNull: false,
    },
    durationSec: {
      type: DataTypes.INTEGER,
      field: 'duration_sec',
    },
    note: {
      type: DataTypes.STRING(1000),
    },
    pieceId: {
      type: DataTypes.UUID,
      field: 'piece_id',
    },
    pieceTitleSnapshot: {
      type: DataTypes.STRING(300),
      field: 'piece_title_snapshot',
    },
    pieceComposerSnapshot: {
      type: DataTypes.STRING(300),
      field: 'piece_composer_snapshot',
    },
    pieceDurationSecSnapshot: {
      type: DataTypes.INTEGER,
      field: 'piece_duration_sec_snapshot',
    },
    instrument: {
      type: DataTypes.STRING(120),
    },
    performerNames: {
      type: DataTypes.STRING(300),
      field: 'performer_names',
    },
    speechTitle: {
      type: DataTypes.STRING(200),
      field: 'speech_title',
    },
    speechSource: {
      type: DataTypes.STRING(200),
      field: 'speech_source',
    },
    speechSpeaker: {
      type: DataTypes.STRING(120),
      field: 'speech_speaker',
    },
    speechText: {
      type: DataTypes.TEXT,
      field: 'speech_text',
    },
    breakTitle: {
      type: DataTypes.STRING(200),
      field: 'break_title',
    },
    slotLabel: {
      type: DataTypes.STRING(120),
      field: 'slot_label',
    },
  }, {
    tableName: 'program_items',
    underscored: true,
    paranoid: true,
  });

  return ProgramItem;
};
