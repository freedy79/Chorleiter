const db = require('../models');
const Program = db.program;
const { programPdf } = require('../services/pdf.service');

// Create a draft revision of a published program so that further changes
// do not modify the published version. Copies all existing items to the new
// revision and returns it. If an itemId is provided, the returned object will
// also contain the id of the cloned item so that subsequent operations can
// target the newly created item.
async function ensureEditableProgram(id, userId, itemId) {
  const program = await Program.findByPk(id);
  if (!program) return { program: null, itemId: null };
  if (program.status !== 'published') return { program, itemId };

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
  let mappedItemId = null;
  await Promise.all(
    items.map(async item => {
      const data = item.get({ plain: true });
      const oldId = data.id;
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;
      delete data.deletedAt;
      data.programId = revision.id;
      const created = await db.program_item.create(data);
      if (oldId === itemId) mappedItemId = created.id;
    })
  );
  return { program: revision, itemId: mappedItemId };
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
      where: { choirId: req.activeChoirId, publishedFromId: null },
      order: [['createdAt', 'DESC']],
    });

    // For each published program, check if a draft revision exists and
    // annotate it so the frontend knows editing is in progress.
    const drafts = await Program.findAll({
      where: {
        choirId: req.activeChoirId,
        status: 'draft',
        publishedFromId: { [db.Sequelize.Op.ne]: null },
      },
    });
    const draftByPublishedId = new Map(drafts.map(d => [d.publishedFromId, d]));

    const result = programs.map(p => {
      const json = p.toJSON();
      const draft = draftByPublishedId.get(p.id);
      if (draft) {
        json.hasDraft = true;
        json.draftId = draft.id;
      }
      return json;
    });

    res.status(200).send(result);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Retrieve the most recently published program for the active choir
exports.findLastPublished = async (req, res) => {
  try {
    const program = await Program.findOne({
      where: { choirId: req.activeChoirId, status: 'published' },
      order: [['publishedAt', 'DESC']],
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });
    res.status(200).send(program);
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

// Get the appropriate program for editing:
// - If the program is a draft, return it as-is
// - If the program is published, check if a draft revision exists:
//   - If yes, return the draft revision
//   - If no, return the published program (user can start editing)
exports.getForEditing = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id, {
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });
    if (!program) return res.status(404).send({ message: 'program not found' });

    // If it's a draft, return it
    if (program.status === 'draft') {
      return res.status(200).send(program);
    }

    // If it's published, check for an existing draft revision
    const draft = await Program.findOne({
      where: { publishedFromId: id, status: 'draft' },
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });

    // Return whichever exists (draft takes priority)
    res.status(200).send(draft || program);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.downloadPdf = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id, {
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });
    if (!program) return res.status(404).send({ message: 'program not found' });
    const buffer = await programPdf(program.toJSON());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="programm-${program.id}.pdf"`);
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).send({ message: err.message || 'Could not generate PDF.' });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    // If this is a published program, also delete any draft revisions based on it
    if (program.status === 'published') {
      const draftRevisions = await Program.findAll({ where: { publishedFromId: id } });
      for (const revision of draftRevisions) {
        await db.program_item.destroy({ where: { programId: revision.id } });
        await db.program_element.destroy({ where: { programId: revision.id } });
        await revision.destroy();
      }
    } else if (program.publishedFromId) {
      // If this is a draft revision, check if the published version still exists and delete it too
      const published = await Program.findByPk(program.publishedFromId);
      if (published) {
        await db.program_item.destroy({ where: { programId: published.id } });
        await db.program_element.destroy({ where: { programId: published.id } });
        await published.destroy();
      }
    }

    await db.program_item.destroy({ where: { programId: id } });
    await db.program_element.destroy({ where: { programId: id } });
    await program.destroy();
    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { title, description, startTime } = req.body;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    const start = typeof startTime !== 'undefined' ? (startTime === null ? null : new Date(startTime)) : program.startTime;

    await program.update(
      {
        title: typeof title === 'string' && title ? title : program.title,
        description: typeof description !== 'undefined' ? description || null : program.description,
        startTime: start,
        updatedBy: req.userId,
      }
    );
    res.status(200).send(program);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Start editing a published program by creating a draft revision if it doesn't exist
exports.startEditing = async (req, res) => {
  const { id } = req.params;
  try {
    const program = await Program.findByPk(id);
    if (!program) return res.status(404).send({ message: 'program not found' });

    // If already a draft, return it
    if (program.status === 'draft') {
      const full = await Program.findByPk(id, {
        include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
      });
      return res.status(200).send(full);
    }

    // If published, check if draft already exists
    const existingDraft = await Program.findOne({
      where: { publishedFromId: id, status: 'draft' },
    });

    if (existingDraft) {
      const full = await Program.findByPk(existingDraft.id, {
        include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
      });
      return res.status(200).send(full);
    }

    // Create new draft revision
    const { program: revision } = await ensureEditableProgram(id, req.userId);
    const full = await Program.findByPk(revision.id, {
      include: [{ model: db.program_item, as: 'items', separate: true, order: [['sortIndex', 'ASC']] }],
    });
    res.status(200).send(full);
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

    // If this is a draft, we need to handle the previous published version
    if (program.status === 'draft' && program.publishedFromId) {
      const oldPublished = await Program.findByPk(program.publishedFromId);
      if (oldPublished) {
        // Delete the old published version and its items
        await db.program_item.destroy({ where: { programId: oldPublished.id } });
        await db.program_element.destroy({ where: { programId: oldPublished.id } });
        await oldPublished.destroy();
      }
    }

    // Update the draft to published status and clear the publishedFromId
    await program.update({
      status: 'published',
      publishedAt: new Date(),
      publishedFromId: null,
      updatedBy: req.userId
    });
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
    const { program, itemId: mappedSlotId } = await ensureEditableProgram(id, req.userId, slotId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    const piece = await db.piece.findByPk(pieceId, {
      include: [{ model: db.composer, as: 'composer' }],
    });
    if (!piece) return res.status(404).send({ message: 'piece not found' });

    if (slotId) {
      const existing = await db.program_item.findOne({ where: { id: mappedSlotId || slotId, programId: id } });
      if (!existing) return res.status(404).send({ message: 'item not found' });
      const updated = await existing.update({
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
    const { program, itemId: mappedSlotId } = await ensureEditableProgram(id, req.userId, slotId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const existing = await db.program_item.findOne({ where: { id: mappedSlotId || slotId, programId: id } });
      if (!existing) return res.status(404).send({ message: 'item not found' });
      const updated = await existing.update({
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
    const { program, itemId: mappedSlotId } = await ensureEditableProgram(id, req.userId, slotId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const existing = await db.program_item.findOne({ where: { id: mappedSlotId || slotId, programId: id } });
      if (!existing) return res.status(404).send({ message: 'item not found' });
      const updated = await existing.update({
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
    const { program, itemId: mappedSlotId } = await ensureEditableProgram(id, req.userId, slotId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    if (slotId) {
      const existing = await db.program_item.findOne({ where: { id: mappedSlotId || slotId, programId: id } });
      if (!existing) return res.status(404).send({ message: 'item not found' });
      const updated = await existing.update({
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
  let { id } = req.params;
  const { label, note } = req.body;
  try {
    const { program } = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

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
    const { program } = await ensureEditableProgram(id, req.userId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;

    const items = await db.program_item.findAll({ where: { programId: id } });
    const itemIds = items.map(i => i.id);

    // Validate order array
    if (!Array.isArray(order)) {
      return res.status(400).send({ message: 'invalid order: must be an array' });
    }

    if (order.length !== items.length) {
      return res.status(400).send({
        message: 'invalid order: array length mismatch',
        expected: items.length,
        received: order.length
      });
    }

    const invalidIds = order.filter(o => !itemIds.includes(o));
    if (invalidIds.length > 0) {
      return res.status(400).send({
        message: 'invalid order: unknown item IDs',
        invalidIds
      });
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

// Update attributes of a program item
exports.updateItem = async (req, res) => {
  let { id, itemId } = req.params;
  const { durationSec, note } = req.body;
  try {
    const { program, itemId: mappedItemId } = await ensureEditableProgram(id, req.userId, itemId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;
    itemId = mappedItemId || itemId;

    const item = await db.program_item.findOne({ where: { id: itemId, programId: id } });
    if (!item) return res.status(404).send({ message: 'item not found' });

    await item.update({
      durationSec: typeof durationSec === 'number' ? durationSec : (durationSec === null ? null : item.durationSec),
      note: typeof note === 'string' ? note : item.note,
    });

    res.status(200).send(item);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Delete a program item
exports.deleteItem = async (req, res) => {
  let { id, itemId } = req.params;
  try {
    const { program, itemId: mappedItemId } = await ensureEditableProgram(id, req.userId, itemId);
    if (!program) return res.status(404).send({ message: 'program not found' });
    id = program.id;
    itemId = mappedItemId || itemId;

    const item = await db.program_item.findOne({ where: { id: itemId, programId: id } });
    if (!item) return res.status(404).send({ message: 'item not found' });

    await item.destroy();

    const remaining = await db.program_item.findAll({
      where: { programId: id },
      order: [['sortIndex', 'ASC']],
    });
    await Promise.all(remaining.map((it, index) => it.update({ sortIndex: index })));

    res.status(204).send();
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
