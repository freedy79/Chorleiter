module.exports = (sequelize, DataTypes) => {
  const ProgramElement = sequelize.define('program_element', {
    type: {
      type: DataTypes.ENUM('PIECE', 'BREAK', 'SPEECH'),
      allowNull: false
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    pieceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    composer: {
      type: DataTypes.STRING,
      allowNull: true
    },
    instrument: {
      type: DataTypes.STRING,
      allowNull: true
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    speaker: {
      type: DataTypes.STRING,
      allowNull: true
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });
  return ProgramElement;
};
