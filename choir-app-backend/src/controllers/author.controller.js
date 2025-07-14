const db = require("../models");
const Author = db.author;
const BaseCrudController = require("./baseCrud.controller");
const base = new BaseCrudController(Author);

exports.create = async (req, res, next) => {
    try {
        const author = await base.service.create({
            name: req.body.name,
            birthYear: req.body.birthYear,
            deathYear: req.body.deathYear
        });
        res.status(201).send(author);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "An author with this name already exists." });
        }
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
        res.status(404).send({ message: "Author not found." });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "An author with this name already exists." });
        }
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
}

exports.findAll = async (req, res, next) => {
    try {
        const authors = await base.service.findAll({
            order: [['name', 'ASC']]
        });
        const result = await Promise.all(
            authors.map(async (author) => {
                const pieceCount = await author.countPieces();
                return {
                    ...author.get({ plain: true }),
                    canDelete: pieceCount === 0
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
        const author = await Author.findByPk(id);
        if (!author) return res.status(404).send({ message: "Author not found." });
        const pieceCount = await author.countPieces();
        if (pieceCount > 0) {
            return res.status(400).send({ message: "Author has linked pieces." });
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
        const author = await Author.findByPk(id);
        if (!author) return res.status(404).send({ message: "Author not found." });

        const query = encodeURIComponent(author.name);
        const url = `https://musicbrainz.org/ws/2/artist/?query=${query}&fmt=json&limit=1`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'chorleiter/1.0 ( https://example.com )' }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        const artist = data.artists && data.artists[0];
        if (artist && artist["life-span"]) {
            const span = artist["life-span"];
            if (span.begin) author.birthYear = span.begin.substring(0, 4);
            if (span.end) author.deathYear = span.end.substring(0, 4);
            await author.save();
            return res.status(200).send(author);
        } else {
            return res.status(404).send({ message: "No data found" });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
