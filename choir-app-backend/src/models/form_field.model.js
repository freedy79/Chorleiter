module.exports = (sequelize, DataTypes) => {
  const FormField = sequelize.define('form_field', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    formId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
          'text_short',
          'text_long',
          'number',
          'checkbox',
          'select',
          'radio',
          'multi_checkbox',
          'date',
          'time',
          'rating',
          'email',
          'heading',
          'separator'
        ]]
      }
    },
    label: {
      type: DataTypes.STRING,
      allowNull: false
    },
    placeholder: {
      type: DataTypes.STRING,
      allowNull: true
    },
    required: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    options: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON array of options for select/checkbox types, e.g. ["Option A","Option B"]'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    validationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'JSON object with validation rules, e.g. { minLength: 2, maxLength: 100, min: 0, max: 100, pattern: "..." }'
    },
    showIf: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Conditional visibility: { fieldId: 1, operator: "equals", value: "Yes" }'
    }
  });

  return FormField;
};
