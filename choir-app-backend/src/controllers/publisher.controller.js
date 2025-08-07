const db = require("../models");
const Publisher = db.publisher;
const BaseCrudController = require("./baseCrud.controller");

class PublisherController extends BaseCrudController {
    constructor() {
        super(Publisher);
        this.create = this.create.bind(this);
        this.update = this.update.bind(this);
        this.findAll = this.findAll.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req, res, next) {
        try {
            req.body = { name: req.body.name };
            return await super.create(req, res, next);
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).send({ message: "A publisher with this name already exists." });
            }
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async update(req, res, next) {
        try {
            return await super.update(req, res, next);
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).send({ message: "A publisher with this name already exists." });
            }
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async findAll(req, res, next) {
        try {
            const publishers = await this.service.findAll({ order: [['name', 'ASC']] });
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
    }

    async delete(req, res, next) {
        const { id } = req.params;
        try {
            const publisher = await Publisher.findByPk(id);
            if (!publisher) return res.status(404).send({ message: "Publisher not found." });
            const collectionCount = await publisher.countCollections();
            if (collectionCount > 0) {
                return res.status(400).send({ message: "Publisher has linked collections." });
            }
            return super.delete(req, res, next);
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }
}

module.exports = new PublisherController();
