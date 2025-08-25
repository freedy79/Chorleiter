class CrudService {
  constructor(model) {
    this.model = model;
  }

  async create(data, options = {}) {
    return await this.model.create(data, options);
  }

  async findAll(options = {}) {
    return await this.model.findAll(options);
  }

  async findById(id, options = {}) {
    return await this.model.findByPk(id, options);
  }

  async update(id, data, options = {}) {
    const [num] = await this.model.update(data, { where: { id }, ...options });
    return num;
  }

  async delete(id, options = {}) {
    return await this.model.destroy({ where: { id }, ...options });
  }
}

module.exports = CrudService;
