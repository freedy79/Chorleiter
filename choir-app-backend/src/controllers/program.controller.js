const db = require('../models');
const Program = db.program;

exports.create = async (req, res) => {
  const { title, description, startTime } = req.body;
  if (!title) return res.status(400).send({ message: 'title required' });
  try {
    const start = startTime ? new Date(startTime) : null;
    const program = await Program.create({
      choirId: req.activeChoirId,
      title,
      description: description || null,
      startTime: start,
      createdBy: req.userId,
      updatedBy: req.userId,
    });
    const full = await Program.findByPk(program.id, {
      include: [{ model: db.program_item, as: 'items' }]
    });
    res.status(201).send(full);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
