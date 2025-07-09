const CrudService = require('../services/crud.service');

class BaseCrudController {
    constructor(model) {
        this.service = new CrudService(model);

        // Bind methods so they can be used directly as route handlers
        this.create = this.create.bind(this);
        this.findAll = this.findAll.bind(this);
        this.findById = this.findById.bind(this);
        this.update = this.update.bind(this);
        this.delete = this.delete.bind(this);
    }

    async create(req, res, next) {
        try {
            const item = await this.service.create(req.body);
            res.status(201).send(item);
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async findAll(req, res, next) {
        try {
            const items = await this.service.findAll();
            res.status(200).send(items);
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async findById(req, res, next) {
        try {
            const id = req.params.id;
            const item = await this.service.findById(id);
            if (!item) return res.status(404).send({ message: `Not found.` });
            res.status(200).send(item);
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async update(req, res, next) {
        try {
            const id = req.params.id;
            const num = await this.service.update(id, req.body);
            if (num === 1) {
                const updated = await this.service.findById(id);
                return res.status(200).send(updated);
            }
            res.status(404).send({ message: `Not found.` });
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }

    async delete(req, res, next) {
        try {
            const id = req.params.id;
            const num = await this.service.delete(id);
            if (num === 1) return res.status(204).send();
            res.status(404).send({ message: `Not found.` });
        } catch (err) {
            if (next) return next(err);
            res.status(500).send({ message: err.message });
        }
    }
}

module.exports = BaseCrudController;
