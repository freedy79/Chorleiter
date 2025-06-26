const db = require("../models");

// Holt alle Entitäten eines bestimmten Typs für die Admin-Tabellen
exports.getAll = (model) => async (req, res) => {
    try {
        const items = await model.findAll({ order: [['name', 'ASC']] });
        res.status(200).send(items);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// ... hier würden auch Funktionen für create, update, delete stehen ...
