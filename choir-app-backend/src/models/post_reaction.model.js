module.exports = (sequelize, DataTypes) => {
  const PostReaction = sequelize.define('post_reaction', {
    type: {
      type: DataTypes.STRING,
      allowNull: false
    }
  });
  return PostReaction;
};
