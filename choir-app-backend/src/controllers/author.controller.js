const db = require("../models");
const Author = db.author;

exports.create = async (req, res) => {
    try {
        const author = await Author.create({
            name: req.body.name,
            birthYear: req.body.birthYear,
            deathYear: req.body.deathYear
        });
        res.status(201).send(author);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.update = async (req, res) => {
    const { id } = req.params;
    try {
        const author = await Author.findByPk(id);
        if (!author) return res.status(404).send({ message: "Author not found." });

        author.name = req.body.name || author.name;
        author.birthYear = req.body.birthYear || author.birthYear;
        author.deathYear = req.body.deathYear || author.deathYear;
        await author.save();
        res.status(200).send(author);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}

exports.findAll = async (req, res) => {
    try {
        const authors = await Author.findAll({
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
        res.status(500).send({ message: err.message });
    }
};

exports.remove = async (req, res) => {
    const { id } = req.params;
    try {
        const author = await Author.findByPk(id);
        if (!author) return res.status(404).send({ message: "Author not found." });
        const pieceCount = await author.countPieces();
        if (pieceCount > 0) {
            return res.status(400).send({ message: "Author has linked pieces." });
        }
        await author.destroy();
        res.status(204).send();
    } catch (err) {
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
