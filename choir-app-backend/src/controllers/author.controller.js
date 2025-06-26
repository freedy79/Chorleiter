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
        res.status(200).send(authors);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
