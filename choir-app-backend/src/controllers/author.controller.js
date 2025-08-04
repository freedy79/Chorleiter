const db = require("../models");
const createCreatorController = require("./creator.controller");

module.exports = createCreatorController(db.author, {
  entityName: 'Author',
  pieceField: 'authorId'
});
