const db = require("../models");
const Category = db.category;

exports.create = async (req, res) => {
    try {
        const category = await Category.create({ name: req.body.name });
        res.status(201).send(category);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "A category with this name already exists." });
        }
        res.status(500).send({ message: err.message });
    }
};

exports.findAll = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        res.status(200).send(categories);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};