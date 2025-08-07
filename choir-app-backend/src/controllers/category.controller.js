const db = require("../models");
const Category = db.category;
const { Op } = require('sequelize');
const BaseCrudController = require("./baseCrud.controller");

class CategoryController extends BaseCrudController {
    constructor() {
        super(Category);
        this.create = this.create.bind(this);
        this.findAll = this.findAll.bind(this);
    }

    async create(req, res, next) {
        try {
            req.body = { name: req.body.name };
            return await super.create(req, res, next);
        } catch (err) {
            if (err.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).send({ message: "A category with this name already exists." });
            }
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async findAll(req, res, next) {
        const { collectionIds } = req.query;
        try {
            if (collectionIds) {
                let ids = Array.isArray(collectionIds) ? collectionIds : String(collectionIds).split(',');
                ids = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                if (ids.length) {
                    const categories = await Category.findAll({
                        include: [{
                            model: db.piece,
                            as: 'pieces',
                            attributes: [],
                            include: [{
                                model: db.collection,
                                as: 'collections',
                                attributes: [],
                                through: { attributes: [] },
                                where: { id: { [Op.in]: ids } },
                                required: true
                            }],
                            required: true
                        }],
                        group: ['category.id'],
                        order: [['name', 'ASC']]
                    });
                    return res.status(200).send(categories);
                }
            }
            const categories = await this.service.findAll({ order: [['name', 'ASC']] });
            res.status(200).send(categories);
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }
}

module.exports = new CategoryController();
