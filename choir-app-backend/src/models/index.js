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
db.monthly_plan = require("./monthly_plan.model.js")(sequelize, Sequelize);
db.plan_rule = require("./plan_rule.model.js")(sequelize, Sequelize);
db.plan_entry = require("./plan_entry.model.js")(sequelize, Sequelize);
db.user_availability = require("./user_availability.model.js")(sequelize, Sequelize);
db.event_pieces = require("./event_pieces.model.js")(sequelize, Sequelize);
db.composer = require("./composer.model.js")(sequelize, Sequelize);
db.category = require("./category.model.js")(sequelize, Sequelize);
db.choir_repertoire = require("./choir_repertoire.model.js")(sequelize, Sequelize);
db.collection = require("./collection.model.js")(sequelize, Sequelize);
db.collection_piece = require("./collection_piece.model.js")(sequelize, Sequelize);
db.author = require("./author.model.js")(sequelize, Sequelize);
db.publisher = require("./publisher.model.js")(sequelize, Sequelize);
db.piece_arranger = require("./piece_arranger.model.js")(sequelize, Sequelize);
db.piece_composer = require("./piece_composer.model.js")(sequelize, Sequelize);
db.piece_link = require("./piece_link.model.js")(sequelize, Sequelize);
db.user_choir = require("./user_choir.model.js")(sequelize, Sequelize);
db.piece_change = require("./piece_change.model.js")(sequelize, Sequelize);
db.piece_note = require("./piece_note.model.js")(sequelize, Sequelize);
db.repertoire_filter = require("./repertoire_filter.model.js")(sequelize, Sequelize);
db.login_attempt = require("./login_attempt.model.js")(sequelize, Sequelize);
db.mail_setting = require("./mail_setting.model.js")(sequelize, Sequelize);
db.mail_template = require("./mail_template.model.js")(sequelize, Sequelize);
db.system_setting = require("./system_setting.model.js")(sequelize, Sequelize);
db.post = require("./post.model.js")(sequelize, Sequelize);
db.library_item = require("./library_item.model.js")(sequelize, Sequelize);
db.loan_request = require("./loan_request.model.js")(sequelize, Sequelize);
db.loan_request_item = require("./loan_request_item.model.js")(sequelize, Sequelize);
db.program = require("./program.model.js")(sequelize, Sequelize);
db.program_element = require("./program_element.model.js")(sequelize, Sequelize);

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
db.user.hasMany(db.event, { as: "organistEvents", foreignKey: "organistId" });
db.event.belongsTo(db.user, { foreignKey: "organistId", as: "organist" });
db.user.hasMany(db.plan_entry, { as: "directedPlanEntries", foreignKey: "directorId" });
db.plan_entry.belongsTo(db.user, { foreignKey: "directorId", as: "director" });
db.user.hasMany(db.plan_entry, { as: "organistPlanEntries", foreignKey: "organistId" });
db.plan_entry.belongsTo(db.user, { foreignKey: "organistId", as: "organist" });
db.choir.hasMany(db.monthly_plan, { as: "monthlyPlans" });
db.monthly_plan.belongsTo(db.choir, { foreignKey: "choirId", as: "choir" });
db.monthly_plan.hasMany(db.event, { as: "events" });
db.event.belongsTo(db.monthly_plan, { foreignKey: "monthlyPlanId", as: "monthlyPlan" });
db.monthly_plan.hasMany(db.plan_entry, { as: "entries" });
db.plan_entry.belongsTo(db.monthly_plan, { foreignKey: "monthlyPlanId", as: "monthlyPlan" });
db.choir.hasMany(db.plan_rule, { as: "planRules" });
db.plan_rule.belongsTo(db.choir, { foreignKey: "choirId", as: "choir" });

db.choir.hasMany(db.program, { as: 'programs' });
db.program.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });

db.program.hasMany(db.program_element, { as: 'elements' });
db.program_element.belongsTo(db.program, { foreignKey: 'programId', as: 'program' });

db.piece.hasMany(db.program_element, { as: 'programElements' });
db.program_element.belongsTo(db.piece, { foreignKey: 'pieceId', as: 'piece' });

db.user.hasMany(db.user_availability, { as: 'availabilities' });
db.user_availability.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });
db.choir.hasMany(db.user_availability, { as: 'availabilities' });
db.user_availability.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });

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

db.publisher.hasMany(db.collection, { as: "collections" });
db.collection.belongsTo(db.publisher, { foreignKey: "publisherId", as: "publisherEntity" });

// Piece <> Composer (roles) -> Many-to-Many
db.piece.belongsToMany(db.composer, { through: db.piece_composer, as: 'composers' });
db.composer.belongsToMany(db.piece, { through: db.piece_composer, as: 'piecesComposed' });

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

// Notes attached to a piece
db.piece.hasMany(db.piece_note, { as: 'notes' });
db.piece_note.belongsTo(db.piece, { foreignKey: 'pieceId' });
db.choir.hasMany(db.piece_note, { as: 'pieceNotes' });
db.piece_note.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.user.hasMany(db.piece_note, { as: 'pieceNotes' });
db.piece_note.belongsTo(db.user, { foreignKey: 'userId', as: 'author' });

// Repertoire Filter Presets
db.user.hasMany(db.repertoire_filter, { as: 'repertoireFilters' });
db.repertoire_filter.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });
db.choir.hasMany(db.repertoire_filter, { as: 'repertoireFilters' });
db.repertoire_filter.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });

// Posts written by choir members
db.choir.hasMany(db.post, { as: 'posts' });
db.post.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.user.hasMany(db.post, { as: 'posts' });
db.post.belongsTo(db.user, { foreignKey: 'userId', as: 'author' });
db.piece.hasMany(db.post, { as: 'posts' });
db.post.belongsTo(db.piece, { foreignKey: 'pieceId', as: 'piece' });

// Library items referencing collections
db.collection.hasMany(db.library_item, { as: 'libraryItems', foreignKey: 'collectionId' });
db.library_item.belongsTo(db.collection, { foreignKey: 'collectionId', as: 'collection' });

// Loan requests
db.loan_request.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.loan_request.belongsTo(db.user, { foreignKey: 'userId', as: 'requester' });
db.loan_request.hasMany(db.loan_request_item, { as: 'items', foreignKey: 'loanRequestId' });
db.loan_request_item.belongsTo(db.loan_request, { foreignKey: 'loanRequestId', as: 'loanRequest' });
db.loan_request_item.belongsTo(db.library_item, { foreignKey: 'libraryItemId', as: 'libraryItem' });


module.exports = db;
