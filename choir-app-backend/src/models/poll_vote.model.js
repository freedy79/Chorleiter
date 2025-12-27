module.exports = (sequelize, DataTypes) => {
  const PollVote = sequelize.define('poll_vote', {}, {
    indexes: [
      { unique: true, fields: ['pollId', 'userId', 'pollOptionId'] }
    ]
  });
  return PollVote;
};
