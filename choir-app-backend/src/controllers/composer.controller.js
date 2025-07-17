const db = require("../models");
const Composer = db.composer;
const BaseCrudController = require("./baseCrud.controller");
const base = new BaseCrudController(Composer);

exports.create = async (req, res, next) => {
    try {
        const { name, birthYear, deathYear } = req.body;
        const force = req.query.force === 'true';
        if (!force) {
            const existing = await Composer.findOne({ where: { name } });
            if (existing) {
                return res.status(409).send({ message: "A composer with this name already exists." });
            }
        }
        const composer = await base.service.create({
            name,
            birthYear,
            deathYear
        });
        res.status(201).send(composer);
    } catch (err) {
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

exports.update = async (req, res, next) => {
    try {
        const id = req.params.id;
        const num = await base.service.update(id, req.body);
        if (num === 1) {
            const updated = await base.service.findById(id);
            return res.status(200).send(updated);
        }
        res.status(404).send({ message: "Composer not found." });
    } catch (err) {
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
}

exports.findAll = async (req, res, next) => {
    try {
        const composers = await base.service.findAll({
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
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

exports.delete = async (req, res, next) => {
    const { id } = req.params;
    try {
        const composer = await Composer.findByPk(id);
        if (!composer) return res.status(404).send({ message: "Composer not found." });
        const pieceCount = await composer.countPieces();
        const arrangedCount = await composer.countArrangedPieces();
        if (pieceCount + arrangedCount > 0) {
            return res.status(400).send({ message: "Composer has linked pieces." });
        }
        return base.delete(req, res, next);
    } catch (err) {
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

exports.enrich = async (req, res) => {
    const { id } = req.params;
    try {
        const composer = await Composer.findByPk(id);
        if (!composer) return res.status(404).send({ message: "Composer not found." });

        const query = encodeURIComponent(composer.name);
        const url = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json&limit=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'chorleiter/1.0 ( https://example.com )' }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        const artist = data.artists && data.artists[0];
        if (artist && artist["life-span"]) {
            const span = artist["life-span"];
            if (span.begin) composer.birthYear = span.begin.substring(0, 4);
            if (span.end) composer.deathYear = span.end.substring(0, 4);
            await composer.save();
            return res.status(200).send(composer);
        } else {
            return res.status(404).send({ message: "No data found" });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};