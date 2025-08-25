module.exports = (sequelize, DataTypes) => {
  const Program = sequelize.define('program', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
      allowNull: false,
      defaultValue: 'DRAFT'
    },
    startTime: {
      type: DataTypes.DATE,
      allowNull: true
    }
  });
  return Program;
};
