module.exports = (sequelize, DataTypes) => {
  const FormAnswer = sequelize.define('form_answer', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    submissionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    fieldId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  return FormAnswer;
};
