const db = require("../models");
const Composer = db.composer;

exports.create = async (req, res) => {
    try {
        const composer = await Composer.create({
            name: req.body.name
        });
        res.status(201).send(composer);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;  
    try {
        const composer = await Composer.findByPk(id);
        if (!composer) return res.status(404).send({ message: "Composer not found." });

        composer.name = req.body.name || composer.name;
        await composer.save();
        res.status(200).send(composer);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

exports.findAll = async (req, res) => {
    try {
        const composers = await Composer.findAll({
            order: [['name', 'ASC']]
        });
        res.status(200).send(composers);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};