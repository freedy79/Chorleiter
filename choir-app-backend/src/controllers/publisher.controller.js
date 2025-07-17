const db = require("../models");
const Publisher = db.publisher;
const BaseCrudController = require("./baseCrud.controller");
const base = new BaseCrudController(Publisher);

exports.create = async (req, res, next) => {
    try {
        const publisher = await base.service.create({ name: req.body.name });
        res.status(201).send(publisher);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "A publisher with this name already exists." });
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
        res.status(404).send({ message: "Publisher not found." });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "A publisher with this name already exists." });
        }
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

exports.findAll = async (req, res, next) => {
    try {
        const publishers = await base.service.findAll({ order: [['name', 'ASC']] });
        const result = await Promise.all(
            publishers.map(async (publisher) => {
                const collectionCount = await publisher.countCollections();
                return { ...publisher.get({ plain: true }), canDelete: collectionCount === 0 };
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
        const publisher = await Publisher.findByPk(id);
        if (!publisher) return res.status(404).send({ message: "Publisher not found." });
        const collectionCount = await publisher.countCollections();
        if (collectionCount > 0) {
            return res.status(400).send({ message: "Publisher has linked collections." });
        }
        return base.delete(req, res, next);
    } catch (err) {
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};
