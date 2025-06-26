const db = require("../models");
const Composer = db.composer;

exports.create = async (req, res) => {
    try {
        const composer = await Composer.create({
            name: req.body.name,
            birthYear: req.body.birthYear,
            deathYear: req.body.deathYear
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
        composer.birthYear = req.body.birthYear || composer.birthYear;
        composer.deathYear = req.body.deathYear || composer.deathYear;
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
        const result = await Promise.all(
            composers.map(async (composer) => {
                const pieceCount = await composer.countPieces();
                const arrangedCount = await composer.countArrangedPieces();
                return {
                    ...composer.get({ plain: true }),
                    canDelete: pieceCount + arrangedCount === 0
                };
            })
        );
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const composer = await Composer.findByPk(id);
        if (!composer) return res.status(404).send({ message: "Composer not found." });
        const pieceCount = await composer.countPieces();
        const arrangedCount = await composer.countArrangedPieces();
        if (pieceCount + arrangedCount > 0) {
            return res.status(400).send({ message: "Composer has linked pieces." });
        }
        await composer.destroy();
        res.status(204).send();
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};