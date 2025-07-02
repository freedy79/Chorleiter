const db = require('../models');
const PlanRule = db.plan_rule;

exports.findAll = async (req, res) => {
  try {
    const rules = await PlanRule.findAll({ where: { choirId: req.activeChoirId } });
    res.status(200).send(rules);
  } catch (err) {
    res.status(500).send({ message: err.message || 'Could not fetch rules.' });
  }
};

exports.create = async (req, res) => {
  const { type, dayOfWeek, weeks, notes } = req.body;
  if (typeof dayOfWeek !== 'number' || !type) {
    return res.status(400).send({ message: 'type and dayOfWeek required' });
  }
  try {
    const rule = await PlanRule.create({
      choirId: req.activeChoirId,
      type,
      dayOfWeek,
      weeks,
      notes
    });
    res.status(201).send(rule);
  } catch (err) {
    res.status(500).send({ message: err.message || 'Could not create rule.' });
  }
};

exports.update = async (req, res) => {
  const id = req.params.id;
  const { type, dayOfWeek, weeks, notes } = req.body;
  try {
    const rule = await PlanRule.findOne({ where: { id, choirId: req.activeChoirId } });
    if (!rule) return res.status(404).send({ message: 'Rule not found.' });
    await rule.update({ type, dayOfWeek, weeks, notes });
    res.status(200).send(rule);
  } catch (err) {
    res.status(500).send({ message: err.message || 'Could not update rule.' });
  }
};

exports.delete = async (req, res) => {
  const id = req.params.id;
  try {
    const num = await PlanRule.destroy({ where: { id, choirId: req.activeChoirId } });
    if (num === 1) {
      res.send({ message: 'Rule deleted successfully!' });
    } else {
      res.status(404).send({ message: 'Rule not found.' });
    }
  } catch (err) {
    res.status(500).send({ message: err.message || 'Could not delete rule.' });
  }
};
