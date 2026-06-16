const logger = require('../config/logger');
const db = require('../models');

function resolveExistingTableName(existingTables, preferred, fallback) {
    if (existingTables.has(preferred)) return preferred;
    if (existingTables.has(fallback)) return fallback;
    return null;
}

async function ensureFormTables() {
    logger.info('[Migration] Ensuring form tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    const formsTable = resolveExistingTableName(existingTables, 'forms', 'form');
    const formFieldsTable = resolveExistingTableName(existingTables, 'form_fields', 'form_field');
    const formSubmissionsTable = resolveExistingTableName(existingTables, 'form_submissions', 'form_submission');
    const formAnswersTable = resolveExistingTableName(existingTables, 'form_answers', 'form_answer');

    // Create tables in dependency order
    if (!formsTable) {
        await db.form.sync();
        logger.info('[Migration] Created table: forms');
    } else {
        logger.info(`[Migration] Table ${formsTable} already exists - checking columns`);
        await ensureFormColumns(queryInterface, formsTable);
    }

    if (!formFieldsTable) {
        await db.form_field.sync();
        logger.info('[Migration] Created table: form_fields');
    } else {
        logger.info(`[Migration] Table ${formFieldsTable} already exists - checking columns`);
        await ensureFormFieldColumns(queryInterface, formFieldsTable);
    }

    if (!formSubmissionsTable) {
        await db.form_submission.sync();
        logger.info('[Migration] Created table: form_submissions');
    } else {
        logger.info(`[Migration] Table ${formSubmissionsTable} already exists - skipping`);
    }

    if (!formAnswersTable) {
        await db.form_answer.sync();
        logger.info('[Migration] Created table: form_answers');
    } else {
        logger.info(`[Migration] Table ${formAnswersTable} already exists - skipping`);
    }
}

/**
 * Phase 2/3: Add maxSubmissions + notifyOnSubmission columns to forms table
 */
async function ensureFormColumns(queryInterface, tableName) {
    try {
        const columns = await queryInterface.describeTable(tableName);

        if (!columns.maxSubmissions) {
            await queryInterface.addColumn(tableName, 'maxSubmissions', {
                type: db.Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
            });
            logger.info(`[Migration] Added column ${tableName}.maxSubmissions`);
        }

        if (!columns.notifyOnSubmission) {
            await queryInterface.addColumn(tableName, 'notifyOnSubmission', {
                type: db.Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            });
            logger.info(`[Migration] Added column ${tableName}.notifyOnSubmission`);
        }

        if (!columns.confirmationText) {
            await queryInterface.addColumn(tableName, 'confirmationText', {
                type: db.Sequelize.TEXT,
                allowNull: true,
                defaultValue: null,
            });
            logger.info(`[Migration] Added column ${tableName}.confirmationText`);
        }
    } catch (err) {
        logger.warn(`[Migration] Error checking/adding form columns on ${tableName}:`, err.message);
    }
}

/**
 * Phase 2/3: Add showIf column to form_fields table
 */
async function ensureFormFieldColumns(queryInterface, tableName) {
    try {
        const columns = await queryInterface.describeTable(tableName);

        if (!columns.showIf) {
            await queryInterface.addColumn(tableName, 'showIf', {
                type: db.Sequelize.JSON,
                allowNull: true,
                defaultValue: null,
            });
            logger.info(`[Migration] Added column ${tableName}.showIf`);
        }
    } catch (err) {
        logger.warn(`[Migration] Error checking/adding form_field columns on ${tableName}:`, err.message);
    }
}

module.exports = {
    ensureFormTables
};
