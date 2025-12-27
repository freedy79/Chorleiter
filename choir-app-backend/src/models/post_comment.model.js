module.exports = (sequelize, DataTypes) => {
  const PostComment = sequelize.define('post_comment', {
    text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });
  return PostComment;
};
