const db = require("../models");

exports.exportData = async (req, res) => {
  try {
    const backup = {};
    for (const [name, model] of Object.entries(db)) {
      if (model && typeof model.findAll === 'function') {
        const records = await model.findAll({ raw: true });
        backup[name] = records;
      }
    }
    const json = JSON.stringify(backup, null, 2);
    res.setHeader('Content-Disposition', 'attachment; filename="backup.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(json);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.importData = async (req, res) => {
  if (!req.file) return res.status(400).send({ message: 'No file uploaded.' });
  try {
    const data = JSON.parse(req.file.buffer.toString());
    await db.sequelize.sync({ force: true });

    const order = [
      'choir',
      'user',
      'composer',
      'author',
      'category',
      'piece',
      'event',
      'collection',
      'user_choir',
      'choir_repertoire',
      'collection_piece',
      'event_pieces',
      'piece_arranger',
      'piece_link',
      'piece_change'
    ];

    for (const name of order) {
      if (data[name] && db[name]) {
        await db[name].bulkCreate(data[name]);
      }
    }

    res.status(200).send({ message: 'Database restored.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
