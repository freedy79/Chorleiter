const db = require("../models");
const Category = db.category;
const { Op } = require('sequelize');
const BaseCrudController = require("./baseCrud.controller");
const base = new BaseCrudController(Category);

exports.create = async (req, res, next) => {
    try {
        const category = await base.service.create({ name: req.body.name });
        res.status(201).send(category);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).send({ message: "A category with this name already exists." });
        }
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

exports.findAll = async (req, res, next) => {
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
        const categories = await base.service.findAll({ order: [['name', 'ASC']] });
        res.status(200).send(categories);
    } catch (err) {
        if (next) return next(err);
        res.status(500).send({ message: err.message });
    }
};

// expose generic handlers for completeness
exports.findById = base.findById;
exports.update = base.update;
exports.delete = base.delete;
