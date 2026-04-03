const logger = require('../config/logger');
const db = require('../models');

const DEFAULT_ROOM_KEY = 'allgemein';
const DEFAULT_ROOM_TITLE = '#allgemein';

async function ensureChatTables() {
  logger.info('[Migration] Ensuring chat tables...');

  await ensureTablesExist();
  await ensureDefaultRooms();

  logger.info('[Migration] Chat tables ensured successfully');
}

async function ensureTablesExist() {
  const queryInterface = db.sequelize.getQueryInterface();
  const existingTables = await queryInterface.showAllTables();
  const tableSet = new Set(existingTables.map(table => table.toLowerCase()));

  if (!tableSet.has('chat_rooms') && !tableSet.has('chat_room')) {
    await db.chat_room.sync();
    logger.info('[Migration] Created table: chat_rooms');
  }

  if (!tableSet.has('chat_messages') && !tableSet.has('chat_message')) {
    await db.chat_message.sync();
    logger.info('[Migration] Created table: chat_messages');
  }

  if (!tableSet.has('chat_read_states') && !tableSet.has('chat_read_state')) {
    await db.chat_read_state.sync();
    logger.info('[Migration] Created table: chat_read_states');
  }

  if (!tableSet.has('chat_room_members') && !tableSet.has('chat_room_member')) {
    await db.chat_room_member.sync();
    logger.info('[Migration] Created table: chat_room_members');
  }

  await ensureChatRoomColumns(queryInterface, tableSet);
}

async function ensureChatRoomColumns(queryInterface, tableSet) {
  const tableName = tableSet.has('chat_rooms') ? 'chat_rooms' : (tableSet.has('chat_room') ? 'chat_room' : null);
  if (!tableName) {
    return;
  }

  const columns = await queryInterface.describeTable(tableName);
  if (!columns.isPrivate) {
    await queryInterface.addColumn(tableName, 'isPrivate', {
      type: db.Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    logger.info('[Migration] Added column chat_rooms.isPrivate');
  }
}

async function ensureDefaultRooms() {
  const choirs = await db.choir.findAll({ attributes: ['id'] });

  for (const choir of choirs) {
    await db.chat_room.findOrCreate({
      where: {
        choirId: choir.id,
        key: DEFAULT_ROOM_KEY
      },
      defaults: {
        choirId: choir.id,
        key: DEFAULT_ROOM_KEY,
        title: DEFAULT_ROOM_TITLE,
        isDefault: true
      }
    });
  }
}

module.exports = {
  ensureChatTables
};
