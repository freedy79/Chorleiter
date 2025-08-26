const db = require('../models');
const Program = db.program;

// Create a draft revision of a published program so that further changes
// do not modify the published version. Copies all existing items to the new
// revision and returns it.
async function ensureEditableProgram(id, userId) {
  const program = await Program.findByPk(id);
  if (!program) return null;
  if (program.status !== 'published') return program;

  const revision = await Program.create({
    choirId: program.choirId,
    title: program.title,
    description: program.description,
    startTime: program.startTime,
    status: 'draft',
    publishedFromId: program.id,
    createdBy: program.createdBy,
    updatedBy: userId ?? program.updatedBy,
  });

  const items = await db.program_item.findAll({ where: { programId: id } });
  await Promise.all(
    items.map(item => {
      const data = item.get({ plain: true });
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
      delete data.deletedAt;
      data.programId = revision.id;
      return db.program_item.create(data);
    })
  );
  return revision;
}

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

// Retrieve all programs for the active choir
exports.findAll = async (req, res) => {
  try {
    const programs = await Program.findAll({
      where: { choirId: req.activeChoirId },
      order: [['createdAt', 'DESC']],
    });
    res.status(200).send(programs);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Retrieve a single program with its items
exports.findOne = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id, {
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });
    if (!program) return res.status(404).send({ message: 'program not found' });
    res.status(200).send(program);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });
    await db.program_item.destroy({ where: { programId: id } });
    await db.program_element.destroy({ where: { programId: id } });
    await program.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


// Publish a program so that choir members can view it
exports.publish = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });
    await program.update({ status: 'published', publishedAt: new Date(), updatedBy: req.userId });
    res.status(200).send(program);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Add a piece item to an existing program
exports.addPieceItem = async (req, res) => {

  let { id } = req.params;
  const { pieceId, title, composer, durationSec, note, slotId } = req.body;

  try {
    const program = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    const piece = await db.piece.findByPk(pieceId, {
      include: [{ model: db.composer, as: 'composer' }],
    });
    if (!piece) return res.status(404).send({ message: 'piece not found' });

    if (slotId) {
      const slot = await db.program_item.findOne({ where: { id: slotId, programId: id, type: 'slot' } });
      if (!slot) return res.status(404).send({ message: 'slot not found' });
      const updated = await slot.update({
        type: 'piece',
        durationSec: typeof durationSec === 'number' ? durationSec : null,
        note: note || null,
        pieceId: piece.id,
        pieceTitleSnapshot: title || piece.title,
        pieceComposerSnapshot: composer || piece.composer?.name || null,
        pieceDurationSecSnapshot: typeof durationSec === 'number' ? durationSec : null,
        slotLabel: null,
      });
      return res.status(200).send(updated);
    }

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'piece',
      durationSec: typeof durationSec === 'number' ? durationSec : null,
      note: note || null,
      pieceId: piece.id,
      pieceTitleSnapshot: title || piece.title,
      pieceComposerSnapshot: composer || piece.composer?.name || null,
      pieceDurationSecSnapshot: typeof durationSec === 'number' ? durationSec : null,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Add a free piece item to an existing program
exports.addFreePieceItem = async (req, res) => {
  let { id } = req.params;
  const { title, composer, instrument, performerNames, durationSec, note, slotId } = req.body;
  try {
    const program = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const slot = await db.program_item.findOne({ where: { id: slotId, programId: id, type: 'slot' } });
      if (!slot) return res.status(404).send({ message: 'slot not found' });
      const updated = await slot.update({
        type: 'piece',
        durationSec: typeof durationSec === 'number' ? durationSec : null,
        note: note || null,
        pieceId: null,
        pieceTitleSnapshot: title,
        pieceComposerSnapshot: composer || null,
        pieceDurationSecSnapshot: typeof durationSec === 'number' ? durationSec : null,
        instrument: instrument || null,
        performerNames: performerNames || null,
        slotLabel: null,
      });
      return res.status(200).send(updated);
    }

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
  let { id } = req.params;
  const { title, source, speaker, text, durationSec, note, slotId } = req.body;
  try {
    const program = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const slot = await db.program_item.findOne({ where: { id: slotId, programId: id, type: 'slot' } });
      if (!slot) return res.status(404).send({ message: 'slot not found' });
      const updated = await slot.update({
        type: 'speech',
        durationSec: typeof durationSec === 'number' ? durationSec : null,
        note: note || null,
        speechTitle: title,
        speechSource: source || null,
        speechSpeaker: speaker || null,
        speechText: text || null,
        slotLabel: null,
      });
      return res.status(200).send(updated);
    }

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

  let { id } = req.params;
  const { durationSec, note, slotId } = req.body;

  try {
    const program = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const slot = await db.program_item.findOne({ where: { id: slotId, programId: id, type: 'slot' } });
      if (!slot) return res.status(404).send({ message: 'slot not found' });
      const updated = await slot.update({
        type: 'break',
        durationSec: typeof durationSec === 'number' ? durationSec : null,
        note: note || null,
        slotLabel: null,
      });
      return res.status(200).send(updated);
    }

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

// Add a slot item to an existing program
exports.addSlotItem = async (req, res) => {
  const { id } = req.params;
  const { label, note } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const sortIndex = await db.program_item.count({ where: { programId: id } });

    const item = await db.program_item.create({
      programId: id,
      sortIndex,
      type: 'slot',
      note: note || null,
      slotLabel: label,
    });
    res.status(201).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};


// Reorder items of a program
exports.reorderItems = async (req, res) => {
  let { id } = req.params;
  const { order } = req.body; // array of item IDs in new order
  try {
    const program = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

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
