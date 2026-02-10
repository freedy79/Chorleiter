module.exports = (sequelize, DataTypes) => {
  const PdfTemplate = sequelize.define('pdf_template', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    config: { type: DataTypes.TEXT('long'), allowNull: false }
  });
  return PdfTemplate;
};
