// Example controller demonstrating the error handling pattern
const db = require('../models');

exports.listItems = async (req, res) => {
  const items = await db.item.findAll();
  res.status(200).send(items);
};
