const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0, // 0 instead of false
  pool: dbConfig.pool
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// --- Import Models ---
db.choir = require("./choir.model.js")(sequelize, Sequelize);
db.user = require("./user.model.js")(sequelize, Sequelize);
db.piece = require("./piece.model.js")(sequelize, Sequelize);
db.event = require("./event.model.js")(sequelize, Sequelize);
db.event_pieces = require("./event_pieces.model.js")(sequelize, Sequelize);
db.composer = require("./composer.model.js")(sequelize, Sequelize);
db.category = require("./category.model.js")(sequelize, Sequelize);
db.choir_repertoire = require("./choir_repertoire.model.js")(sequelize, Sequelize);
db.collection = require("./collection.model.js")(sequelize, Sequelize);
db.collection_piece = require("./collection_piece.model.js")(sequelize, Sequelize);
db.author = require("./author.model.js")(sequelize, Sequelize);
db.piece_arranger = require("./piece_arranger.model.js")(sequelize, Sequelize);
db.piece_link = require("./piece_link.model.js")(sequelize, Sequelize);
db.user_choir = require("./user_choir.model.js")(sequelize, Sequelize);
db.piece_change = require("./piece_change.model.js")(sequelize, Sequelize);
db.repertoire_filter = require("./repertoire_filter.model.js")(sequelize, Sequelize);

// --- Define Associations ---
// A Choir has many Users
db.user.belongsToMany(db.choir, { through: db.user_choir });
db.choir.belongsToMany(db.user, { through: db.user_choir });
db.user_choir.belongsTo(db.user);
db.user_choir.belongsTo(db.choir);

// A Choir has many Pieces
db.choir.belongsToMany(db.piece, { through: db.choir_repertoire });
db.piece.belongsToMany(db.choir, { through: db.choir_repertoire });

// A Choir has many Events
db.choir.hasMany(db.event, { as: "events" });
db.event.belongsTo(db.choir, { foreignKey: "choirId", as: "choir" });

// A User (director) created an Event
db.user.hasMany(db.event, { as: "createdEvents"});
db.event.belongsTo(db.user, { foreignKey: "directorId", as: "director"})

// A User (director) created a Piece
db.user.hasMany(db.piece, { as: "createdPieces"});
db.piece.belongsTo(db.user, { foreignKey: "creatorId", as: "creator"});

// Events and Pieces have a Many-to-Many relationship
db.event.belongsToMany(db.piece, { through: db.event_pieces });
db.piece.belongsToMany(db.event, { through: db.event_pieces });

db.composer.hasMany(db.piece, { as: "pieces" });
db.piece.belongsTo(db.composer, { foreignKey: "composerId", as: "composer" });

db.category.hasMany(db.piece, { as: "pieces" });
db.piece.belongsTo(db.category, { foreignKey: "categoryId", as: "category" });

db.collection.belongsToMany(db.piece, { through: db.collection_piece });
db.piece.belongsToMany(db.collection, { through: db.collection_piece });

db.choir.belongsToMany(db.collection, { through: "choir_collections" });
db.collection.belongsToMany(db.choir, { through: "choir_collections" });

db.author.hasMany(db.piece, { as: "pieces" });
db.piece.belongsTo(db.author, { foreignKey: "authorId", as: "author" });

// Piece <> Composer (as Arranger) -> Many-to-Many
db.piece.belongsToMany(db.composer, { through: db.piece_arranger, as: "arrangers" });
db.composer.belongsToMany(db.piece, { through: db.piece_arranger, as: "arrangedPieces" });

// Piece <> PieceLink -> One-to-Many
db.piece.hasMany(db.piece_link, { as: "links", onDelete: 'CASCADE' });
db.piece_link.belongsTo(db.piece, { foreignKey: "pieceId" });

// Proposed changes to a piece
db.piece.hasMany(db.piece_change, { as: 'changeRequests' });
db.piece_change.belongsTo(db.piece, { foreignKey: 'pieceId' });
db.user.hasMany(db.piece_change, { as: 'pieceChangeRequests' });
db.piece_change.belongsTo(db.user, { foreignKey: 'userId', as: 'proposer' });

// Repertoire Filter Presets
db.user.hasMany(db.repertoire_filter, { as: 'repertoireFilters' });
db.repertoire_filter.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });
db.choir.hasMany(db.repertoire_filter, { as: 'repertoireFilters' });
db.repertoire_filter.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });


module.exports = db;
