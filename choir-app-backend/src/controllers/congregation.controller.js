const db = require("../models");
const asyncHandler = require("express-async-handler");

exports.findAll = asyncHandler(async (req, res) => {
  const congregations = await db.congregation.findAll({
    order: [['name', 'ASC']],
  });
  res.status(200).send(congregations);
});

exports.create = asyncHandler(async (req, res) => {
  const { name, districtId } = req.body;
  const congregation = await db.congregation.create({ name, districtId });
  res.status(201).send(congregation);
});

exports.update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, districtId } = req.body;
  const congregation = await db.congregation.findByPk(id);
  if (!congregation) {
    return res.status(404).send({ message: 'Gemeinde nicht gefunden' });
  }
  congregation.name = name;
  congregation.districtId = districtId;
  await congregation.save();
  res.status(200).send(congregation);
});

exports.remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const congregation = await db.congregation.findByPk(id);
  if (!congregation) {
    return res.status(404).send({ message: 'Gemeinde nicht gefunden' });
  }
  await congregation.destroy();
  res.status(204).send();
});
