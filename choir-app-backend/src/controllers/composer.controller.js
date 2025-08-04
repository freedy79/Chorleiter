const db = require("../models");
const createCreatorController = require("./creator.controller");

module.exports = createCreatorController(db.composer, {
  entityName: 'Composer',
  arranged: true,
  pieceField: 'composerId'
});
