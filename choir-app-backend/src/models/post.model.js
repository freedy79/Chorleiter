module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('post', {
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    pieceId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });
  return Post;
};
