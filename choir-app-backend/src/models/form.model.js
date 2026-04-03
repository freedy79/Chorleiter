module.exports = (sequelize, DataTypes) => {
  const Form = sequelize.define('form', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    choirId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'draft',
      validate: {
        isIn: [['draft', 'published', 'closed']]
      }
    },
    openDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closeDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    publicGuid: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    allowAnonymous: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    allowMultipleSubmissions: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    confirmationText: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    maxSubmissions: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Maximum total submissions (null = unlimited)'
    },
    notifyOnSubmission: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Email the form creator on each new submission'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  return Form;
};
