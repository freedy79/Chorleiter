module.exports = (sequelize, DataTypes) => {
  const FormSubmission = sequelize.define('form_submission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    formId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'null for anonymous/public submissions'
    },
    submitterName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Display name for anonymous submissions'
    },
    submitterEmail: {
      type: DataTypes.STRING,
      allowNull: true
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  return FormSubmission;
};
