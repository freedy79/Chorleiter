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

// Add a piece item to an existing program
exports.addPieceItem = async (req, res) => {
  const { id } = req.params;
  const { pieceId, title, composer, durationSec, note } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const piece = await db.piece.findByPk(pieceId, {
      include: [{ model: db.composer, as: 'composer' }],
    });
    if (!piece) return res.status(404).send({ message: 'piece not found' });

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'piece',
      durationSec: typeof durationSec === 'number' ? durationSec : null,
      note: note || null,
      pieceId: piece.id,
      pieceTitleSnapshot: title || piece.title,
      pieceComposerSnapshot:
        composer || piece.composer?.name || null,
      pieceDurationSecSnapshot:
        typeof durationSec === 'number' ? durationSec : null,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Add a free piece item to an existing program
exports.addFreePieceItem = async (req, res) => {
  const { id } = req.params;
  const { title, composer, instrument, performerNames, durationSec, note } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'piece',
      durationSec: typeof durationSec === 'number' ? durationSec : null,
      note: note || null,
      pieceId: null,
      pieceTitleSnapshot: title,
      pieceComposerSnapshot: composer || null,
      pieceDurationSecSnapshot: typeof durationSec === 'number' ? durationSec : null,
      instrument: instrument || null,
      performerNames: performerNames || null,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.addSpeechItem = async (req, res) => {
  const { id } = req.params;
  const { title, source, speaker, text, durationSec, note } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'speech',
      durationSec: typeof durationSec === 'number' ? durationSec : null,
      note: note || null,
      speechTitle: title,
      speechSource: source || null,
      speechSpeaker: speaker || null,
      speechText: text || null,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
  

// Add a break item to an existing program
exports.addBreakItem = async (req, res) => {
  const { id } = req.params;
  const { durationSec, note } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'break',
      durationSec: typeof durationSec === 'number' ? durationSec : null,
      note: note || null,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


// Reorder items of a program
exports.reorderItems = async (req, res) => {
  const { id } = req.params;
  const { order } = req.body; // array of item IDs in new order
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const items = await db.program_item.findAll({ where: { programId: id } });
    const itemIds = items.map(i => i.id);
    if (order.length !== items.length || !order.every(o => itemIds.includes(o))) {
      return res.status(400).send({ message: 'invalid order' });
    }

    await Promise.all(
      order.map((itemId, index) =>
        db.program_item.update({ sortIndex: index }, { where: { id: itemId, programId: id } })
      )
    );

    const updated = await db.program_item.findAll({
      where: { programId: id },
      order: [['sortIndex', 'ASC']],
    });
    res.status(200).send(updated);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
