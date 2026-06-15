const logger = require('../config/logger');
const db = require('../models');

async function ensurePersonalAddressBookTables() {
    logger.info('[Migration] Ensuring personal address book tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    if (!existingTables.has('personal_address_book_entries') && !existingTables.has('personal_address_book_entry')) {
        await db.personal_address_book_entry.sync();
        logger.info('[Migration] Created table: personal_address_book_entries');
    } else {
        logger.info('[Migration] Table personal_address_book_entries already exists - skipping');
    }

    if (!existingTables.has('monthly_plan_recipient_preferences') && !existingTables.has('monthly_plan_recipient_preference')) {
        await db.monthly_plan_recipient_preference.sync();
        logger.info('[Migration] Created table: monthly_plan_recipient_preferences');
    } else {
        logger.info('[Migration] Table monthly_plan_recipient_preferences already exists - skipping');
    }
}

module.exports = {
    ensurePersonalAddressBookTables
};
