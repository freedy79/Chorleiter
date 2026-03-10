const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  port: dbConfig.PORT,
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
db.practice_list = require("./practice_list.model.js")(sequelize, Sequelize);
db.practice_list_item = require("./practice_list_item.model.js")(sequelize, Sequelize);
db.login_attempt = require("./login_attempt.model.js")(sequelize, Sequelize);
db.mail_setting = require("./mail_setting.model.js")(sequelize, Sequelize);
db.mail_template = require("./mail_template.model.js")(sequelize, Sequelize);
db.pdf_template = require("./pdf_template.model.js")(sequelize, Sequelize);
db.mail_log = require("./mail_log.model.js")(sequelize, Sequelize);
db.system_setting = require("./system_setting.model.js")(sequelize, Sequelize);
db.post = require("./post.model.js")(sequelize, Sequelize);
db.library_item = require("./library_item.model.js")(sequelize, Sequelize);
db.lending = require("./lending.model.js")(sequelize, Sequelize);
db.loan_request = require("./loan_request.model.js")(sequelize, Sequelize);
db.loan_request_item = require("./loan_request_item.model.js")(sequelize, Sequelize);
db.program = require("./program.model.js")(sequelize, Sequelize);
db.program_element = require("./program_element.model.js")(sequelize, Sequelize);
db.program_item = require("./program_item.model.js")(sequelize, Sequelize);
db.district = require("./district.model.js")(sequelize, Sequelize);
 db.congregation = require("./congregation.model.js")(sequelize, Sequelize);
db.donation = require("./donation.model.js")(sequelize, Sequelize);
db.physical_copy = require("./physical_copy.model.js")(sequelize, Sequelize);
db.digital_license = require("./digital_license.model.js")(sequelize, Sequelize);
db.choir_digital_license = require("./choir_digital_license.model.js")(sequelize, Sequelize);
db.choir_log = require("./choir_log.model.js")(sequelize, Sequelize);
db.poll = require("./poll.model.js")(sequelize, Sequelize);
db.poll_option = require("./poll_option.model.js")(sequelize, Sequelize);
db.poll_vote = require("./poll_vote.model.js")(sequelize, Sequelize);
db.poll_vote_reminder_token = require("./poll_vote_reminder_token.model.js")(sequelize, Sequelize);
db.post_comment = require("./post_comment.model.js")(sequelize, Sequelize);
db.post_reaction = require("./post_reaction.model.js")(sequelize, Sequelize);
db.post_image = require("./post_image.model.js")(sequelize, Sequelize);
db.chat_room = require("./chat_room.model.js")(sequelize, Sequelize);
db.chat_message = require("./chat_message.model.js")(sequelize, Sequelize);
db.chat_read_state = require("./chat_read_state.model.js")(sequelize, Sequelize);
db.chat_room_member = require("./chat_room_member.model.js")(sequelize, Sequelize);
db.search_history = require("./search_history.model.js")(sequelize, Sequelize);
db.push_subscription = require("./pushSubscription.model.js")(sequelize, Sequelize);
db.piece_audit_log = require("./piece_audit_log.model.js")(sequelize, Sequelize);
db.data_enrichment_job = require("./data-enrichment-job.model.js")(sequelize, Sequelize);
db.data_enrichment_suggestion = require("./data-enrichment-suggestion.model.js")(sequelize, Sequelize);
db.data_enrichment_setting = require("./data-enrichment-setting.model.js")(sequelize, Sequelize);
db.pwa_config = require("./pwa_config.js")(sequelize, Sequelize);
db.choir_public_page = require('./choir_public_page.model.js')(sequelize, Sequelize);
db.choir_public_asset = require('./choir_public_asset.model.js')(sequelize, Sequelize);
db.audio_marker = require('./audio_marker.model.js')(sequelize, Sequelize);
db.page_view = require('./page_view.model.js')(sequelize, Sequelize);
db.form = require('./form.model.js')(sequelize, Sequelize);
db.form_field = require('./form_field.model.js')(sequelize, Sequelize);
db.form_submission = require('./form_submission.model.js')(sequelize, Sequelize);
db.form_answer = require('./form_answer.model.js')(sequelize, Sequelize);


// --- Define Associations ---
// A Choir has many Users
db.user.belongsToMany(db.choir, { through: db.user_choir });
db.choir.belongsToMany(db.user, { through: db.user_choir });
db.user_choir.belongsTo(db.user);
db.user_choir.belongsTo(db.choir);

// Push subscriptions for notifications
db.user.hasMany(db.push_subscription, { as: 'pushSubscriptions', foreignKey: 'userId' });
db.push_subscription.belongsTo(db.user, { as: 'user', foreignKey: 'userId' });
db.choir.hasMany(db.push_subscription, { as: 'pushSubscriptions', foreignKey: 'choirId' });
db.push_subscription.belongsTo(db.choir, { as: 'choir', foreignKey: 'choirId' });

// A Choir has many Pieces
db.choir.belongsToMany(db.piece, { through: db.choir_repertoire });
db.piece.belongsToMany(db.choir, { through: db.choir_repertoire });

// Direct access to choir_repertoire junction table (needed for queries that filter by repertoire status)
db.piece.hasMany(db.choir_repertoire, { foreignKey: 'pieceId' });
db.choir_repertoire.belongsTo(db.piece, { foreignKey: 'pieceId' });
db.choir.hasMany(db.choir_repertoire, { foreignKey: 'choirId' });
db.choir_repertoire.belongsTo(db.choir, { foreignKey: 'choirId' });

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

// PieceLink <> AudioMarker -> One-to-Many
db.piece_link.hasMany(db.audio_marker, { as: 'markers', foreignKey: 'pieceLinkId', onDelete: 'CASCADE' });
db.audio_marker.belongsTo(db.piece_link, { foreignKey: 'pieceLinkId' });

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

// Personal practice lists
db.user.hasMany(db.practice_list, { as: 'practiceLists', foreignKey: 'userId', onDelete: 'CASCADE' });
db.practice_list.belongsTo(db.user, { as: 'user', foreignKey: 'userId' });
db.choir.hasMany(db.practice_list, { as: 'practiceLists', foreignKey: 'choirId', onDelete: 'CASCADE' });
db.practice_list.belongsTo(db.choir, { as: 'choir', foreignKey: 'choirId' });

db.practice_list.hasMany(db.practice_list_item, { as: 'items', foreignKey: 'practiceListId', onDelete: 'CASCADE' });
db.practice_list_item.belongsTo(db.practice_list, { as: 'practiceList', foreignKey: 'practiceListId' });

db.piece.hasMany(db.practice_list_item, { as: 'practiceListItems', foreignKey: 'pieceId', onDelete: 'CASCADE' });
db.practice_list_item.belongsTo(db.piece, { as: 'piece', foreignKey: 'pieceId' });

db.piece_link.hasMany(db.practice_list_item, { as: 'practiceListItems', foreignKey: 'pieceLinkId', onDelete: 'SET NULL' });
db.practice_list_item.belongsTo(db.piece_link, { as: 'pieceLink', foreignKey: 'pieceLinkId' });

// Posts written by choir members
db.choir.hasMany(db.post, { as: 'posts' });
db.post.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.user.hasMany(db.post, { as: 'posts' });
db.post.belongsTo(db.user, { foreignKey: 'userId', as: 'author' });
db.post.hasOne(db.poll, { as: 'poll', foreignKey: 'postId', onDelete: 'CASCADE' });
db.poll.belongsTo(db.post, { foreignKey: 'postId', as: 'post' });
db.poll.hasMany(db.poll_option, { as: 'options', foreignKey: 'pollId', onDelete: 'CASCADE' });
db.poll_option.belongsTo(db.poll, { foreignKey: 'pollId', as: 'poll' });
db.poll.hasMany(db.poll_vote, { as: 'votes', foreignKey: 'pollId', onDelete: 'CASCADE' });
db.poll_vote.belongsTo(db.poll, { foreignKey: 'pollId', as: 'poll' });
db.poll_option.hasMany(db.poll_vote, { as: 'votes', foreignKey: 'pollOptionId', onDelete: 'CASCADE' });
db.poll_vote.belongsTo(db.poll_option, { foreignKey: 'pollOptionId', as: 'option' });
db.user.hasMany(db.poll_vote, { as: 'pollVotes', foreignKey: 'userId', onDelete: 'CASCADE' });
db.poll_vote.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });
db.poll.hasMany(db.poll_vote_reminder_token, { as: 'reminderTokens', foreignKey: 'pollId', onDelete: 'CASCADE' });
db.poll_vote_reminder_token.belongsTo(db.poll, { foreignKey: 'pollId', as: 'poll' });
db.poll_option.hasMany(db.poll_vote_reminder_token, { as: 'reminderTokens', foreignKey: 'pollOptionId', onDelete: 'CASCADE' });
db.poll_vote_reminder_token.belongsTo(db.poll_option, { foreignKey: 'pollOptionId', as: 'option' });
db.user.hasMany(db.poll_vote_reminder_token, { as: 'pollReminderTokens', foreignKey: 'userId', onDelete: 'CASCADE' });
db.poll_vote_reminder_token.belongsTo(db.user, { foreignKey: 'userId', as: 'recipient' });
db.user.hasMany(db.poll_vote_reminder_token, { as: 'createdPollReminderTokens', foreignKey: 'createdByUserId', onDelete: 'SET NULL' });
db.poll_vote_reminder_token.belongsTo(db.user, { foreignKey: 'createdByUserId', as: 'creator' });
db.post.hasMany(db.post_comment, { as: 'comments', foreignKey: 'postId', onDelete: 'CASCADE' });
db.post_comment.belongsTo(db.post, { foreignKey: 'postId', as: 'post' });
db.post_comment.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.choir.hasMany(db.post_comment, { as: 'postComments', foreignKey: 'choirId' });
db.user.hasMany(db.post_comment, { as: 'postComments', foreignKey: 'userId', onDelete: 'CASCADE' });
db.post_comment.belongsTo(db.user, { foreignKey: 'userId', as: 'author' });
db.post_comment.hasMany(db.post_comment, { as: 'replies', foreignKey: 'parentId', onDelete: 'CASCADE' });
db.post_comment.belongsTo(db.post_comment, { foreignKey: 'parentId', as: 'parent' });
db.post.hasMany(db.post_image, { as: 'images', foreignKey: 'postId', onDelete: 'CASCADE' });
db.post_image.belongsTo(db.post, { foreignKey: 'postId', as: 'post' });
db.post.hasMany(db.post_reaction, { as: 'reactions', foreignKey: 'postId', onDelete: 'CASCADE' });
db.post_reaction.belongsTo(db.post, { foreignKey: 'postId', as: 'post' });
db.post_comment.hasMany(db.post_reaction, { as: 'reactions', foreignKey: 'commentId', onDelete: 'CASCADE' });
db.post_reaction.belongsTo(db.post_comment, { foreignKey: 'commentId', as: 'comment' });
db.user.hasMany(db.post_reaction, { as: 'postReactions', foreignKey: 'userId', onDelete: 'CASCADE' });
db.post_reaction.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });

// Chat rooms, messages and read states
db.choir.hasMany(db.chat_room, { as: 'chatRooms', foreignKey: 'choirId', onDelete: 'CASCADE' });
db.chat_room.belongsTo(db.choir, { as: 'choir', foreignKey: 'choirId' });
db.chat_room.hasMany(db.chat_message, { as: 'messages', foreignKey: 'chatRoomId', onDelete: 'CASCADE' });
db.chat_message.belongsTo(db.chat_room, { as: 'room', foreignKey: 'chatRoomId' });
db.user.hasMany(db.chat_message, { as: 'chatMessages', foreignKey: 'userId', onDelete: 'CASCADE' });
db.chat_message.belongsTo(db.user, { as: 'author', foreignKey: 'userId' });
db.chat_message.belongsTo(db.chat_message, { as: 'replyToMessage', foreignKey: 'replyToMessageId' });
db.chat_message.hasMany(db.chat_message, { as: 'replies', foreignKey: 'replyToMessageId' });
db.chat_room.hasMany(db.chat_read_state, { as: 'readStates', foreignKey: 'chatRoomId', onDelete: 'CASCADE' });
db.chat_read_state.belongsTo(db.chat_room, { as: 'room', foreignKey: 'chatRoomId' });
db.user.hasMany(db.chat_read_state, { as: 'chatReadStates', foreignKey: 'userId', onDelete: 'CASCADE' });
db.chat_read_state.belongsTo(db.user, { as: 'user', foreignKey: 'userId' });
db.chat_read_state.belongsTo(db.chat_message, { as: 'lastReadMessage', foreignKey: 'lastReadMessageId' });
db.chat_room.hasMany(db.chat_room_member, { as: 'roomMembers', foreignKey: 'chatRoomId', onDelete: 'CASCADE' });
db.chat_room_member.belongsTo(db.chat_room, { as: 'room', foreignKey: 'chatRoomId' });
db.user.hasMany(db.chat_room_member, { as: 'chatRoomMemberships', foreignKey: 'userId', onDelete: 'CASCADE' });
db.chat_room_member.belongsTo(db.user, { as: 'user', foreignKey: 'userId' });
db.chat_room.belongsToMany(db.user, {
  through: db.chat_room_member,
  as: 'members',
  foreignKey: 'chatRoomId',
  otherKey: 'userId'
});
db.user.belongsToMany(db.chat_room, {
  through: db.chat_room_member,
  as: 'memberRooms',
  foreignKey: 'userId',
  otherKey: 'chatRoomId'
});

// Donations
db.user.hasMany(db.donation, { as: 'donations' });
db.donation.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });

// Library items referencing collections
db.collection.hasMany(db.library_item, { as: 'libraryItems', foreignKey: 'collectionId' });
db.library_item.belongsTo(db.collection, { foreignKey: 'collectionId', as: 'collection' });

// Individual copies of library items
db.library_item.hasMany(db.lending, { as: 'booklets', foreignKey: 'libraryItemId' });
db.lending.belongsTo(db.library_item, { foreignKey: 'libraryItemId', as: 'libraryItem' });
db.user.hasMany(db.lending, { as: 'borrowedCopies', foreignKey: 'borrowerId' });
db.lending.belongsTo(db.user, { foreignKey: 'borrowerId', as: 'borrower' });

// Physical copies and digital licenses of library items
db.library_item.hasMany(db.physical_copy, { as: 'physicalCopies', foreignKey: 'libraryItemId', onDelete: 'CASCADE' });
db.physical_copy.belongsTo(db.library_item, { foreignKey: 'libraryItemId', as: 'libraryItem' });
db.library_item.hasMany(db.digital_license, { as: 'digitalLicenses', foreignKey: 'libraryItemId', onDelete: 'CASCADE' });
db.digital_license.belongsTo(db.library_item, { foreignKey: 'libraryItemId', as: 'libraryItem' });

// Choir-specific digital licenses linked to choir collections
db.collection.hasMany(db.choir_digital_license, { as: 'choirDigitalLicenses', foreignKey: 'collectionId', onDelete: 'CASCADE' });
db.choir_digital_license.belongsTo(db.collection, { foreignKey: 'collectionId', as: 'collection' });
db.choir.hasMany(db.choir_digital_license, { as: 'digitalLicenses', foreignKey: 'choirId', onDelete: 'CASCADE' });
db.choir_digital_license.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });

// Internal choir copies linked directly to collections
db.collection.hasMany(db.lending, { as: 'copies', foreignKey: 'collectionId' });
db.lending.belongsTo(db.collection, { foreignKey: 'collectionId', as: 'collection' });

// Loan requests
db.loan_request.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.loan_request.belongsTo(db.user, { foreignKey: 'userId', as: 'requester' });
db.loan_request.hasMany(db.loan_request_item, { as: 'items', foreignKey: 'loanRequestId' });
db.loan_request_item.belongsTo(db.loan_request, { foreignKey: 'loanRequestId', as: 'loanRequest' });
db.loan_request_item.belongsTo(db.library_item, { foreignKey: 'libraryItemId', as: 'libraryItem' });

// Programs and items
db.choir.hasMany(db.program, { as: 'programs' });
db.program.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });

db.user.hasMany(db.program, { as: 'createdPrograms', foreignKey: 'createdBy' });
db.user.hasMany(db.program, { as: 'updatedPrograms', foreignKey: 'updatedBy' });
db.program.belongsTo(db.user, { foreignKey: 'createdBy', as: 'creator' });
db.program.belongsTo(db.user, { foreignKey: 'updatedBy', as: 'updater' });

db.program.hasMany(db.program_item, { as: 'items', foreignKey: 'programId' });
db.program_item.belongsTo(db.program, { foreignKey: 'programId', as: 'program' });

db.program.hasMany(db.event, { as: 'events', foreignKey: 'programId' });
db.event.belongsTo(db.program, { foreignKey: 'programId', as: 'program' });

db.program.hasMany(db.plan_entry, { as: 'planEntries', foreignKey: 'programId' });
db.plan_entry.belongsTo(db.program, { foreignKey: 'programId', as: 'program' });

db.piece.hasMany(db.program_item, { as: 'programItems', foreignKey: 'pieceId' });
db.program_item.belongsTo(db.piece, { foreignKey: 'pieceId', as: 'piece' });

db.program.hasMany(db.program_element, { as: 'elements', foreignKey: 'programId' });
db.program_element.belongsTo(db.program, { foreignKey: 'programId', as: 'program' });

db.piece.hasMany(db.program_element, { as: 'programElements', foreignKey: 'pieceId' });
db.program_element.belongsTo(db.piece, { foreignKey: 'pieceId', as: 'piece' });

// Choir logs
db.choir.hasMany(db.choir_log, { as: 'logs' });
db.choir_log.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.user.hasMany(db.choir_log, { as: 'choirLogs' });
db.choir_log.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });

// Search history
db.user.hasMany(db.search_history, { as: 'searchHistory', foreignKey: 'userId' });
db.search_history.belongsTo(db.user, { foreignKey: 'userId', as: 'user' });


// Data Enrichment relationships
db.user.hasMany(db.data_enrichment_job, { as: 'enrichmentJobs', foreignKey: 'createdBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.data_enrichment_job.belongsTo(db.user, { foreignKey: 'createdBy', as: 'creator', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

db.data_enrichment_job.hasMany(db.data_enrichment_suggestion, { as: 'suggestions', foreignKey: 'jobId', onDelete: 'CASCADE' });
db.data_enrichment_suggestion.belongsTo(db.data_enrichment_job, { foreignKey: 'jobId', as: 'job' });

db.user.hasMany(db.data_enrichment_suggestion, { as: 'reviewedSuggestions', foreignKey: 'reviewedBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.data_enrichment_suggestion.belongsTo(db.user, { foreignKey: 'reviewedBy', as: 'reviewer', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

db.user.hasMany(db.data_enrichment_setting, { as: 'modifiedSettings', foreignKey: 'lastModifiedBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
db.data_enrichment_setting.belongsTo(db.user, { foreignKey: 'lastModifiedBy', as: 'modifiedBy', onDelete: 'CASCADE', onUpdate: 'CASCADE' });


// Districts and congregations
 db.district.hasMany(db.congregation, { as: "congregations" });
 db.congregation.belongsTo(db.district, { foreignKey: "districtId", as: "district" });

// Public choir pages
db.choir.hasOne(db.choir_public_page, { as: 'publicPage', foreignKey: 'choirId', onDelete: 'CASCADE' });
db.choir_public_page.belongsTo(db.choir, { as: 'choir', foreignKey: 'choirId' });
db.choir_public_page.hasMany(db.choir_public_asset, { as: 'assets', foreignKey: 'choirPublicPageId', onDelete: 'CASCADE' });
db.choir_public_asset.belongsTo(db.choir_public_page, { as: 'page', foreignKey: 'choirPublicPageId' });

// Forms (surveys)
db.choir.hasMany(db.form, { as: 'forms', foreignKey: 'choirId', onDelete: 'CASCADE' });
db.form.belongsTo(db.choir, { foreignKey: 'choirId', as: 'choir' });
db.user.hasMany(db.form, { as: 'createdForms', foreignKey: 'createdBy' });
db.form.belongsTo(db.user, { foreignKey: 'createdBy', as: 'creator' });
db.form.hasMany(db.form_field, { as: 'fields', foreignKey: 'formId', onDelete: 'CASCADE' });
db.form_field.belongsTo(db.form, { foreignKey: 'formId', as: 'form' });
db.form.hasMany(db.form_submission, { as: 'submissions', foreignKey: 'formId', onDelete: 'CASCADE' });
db.form_submission.belongsTo(db.form, { foreignKey: 'formId', as: 'form' });
db.user.hasMany(db.form_submission, { as: 'formSubmissions', foreignKey: 'userId' });
db.form_submission.belongsTo(db.user, { foreignKey: 'userId', as: 'submitter' });
db.form_submission.hasMany(db.form_answer, { as: 'answers', foreignKey: 'submissionId', onDelete: 'CASCADE' });
db.form_answer.belongsTo(db.form_submission, { foreignKey: 'submissionId', as: 'submission' });
db.form_field.hasMany(db.form_answer, { as: 'answers', foreignKey: 'fieldId', onDelete: 'CASCADE' });
db.form_answer.belongsTo(db.form_field, { foreignKey: 'fieldId', as: 'field' });

module.exports = db;
