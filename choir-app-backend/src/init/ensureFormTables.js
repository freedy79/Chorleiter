const logger = require('../config/logger');
const db = require('../models');

async function ensureFormTables() {
    logger.info('[Migration] Ensuring form tables...');

    const queryInterface = db.sequelize.getQueryInterface();
    const existingTablesRaw = await queryInterface.showAllTables();
    const existingTables = new Set(existingTablesRaw.map(t => String(t).toLowerCase()));

    // Create tables in dependency order
    if (!existingTables.has('forms') && !existingTables.has('form')) {
        await db.form.sync();
        logger.info('[Migration] Created table: forms');
    } else {
        logger.info('[Migration] Table forms already exists - checking columns');
        await ensureFormColumns(queryInterface);
    }

    if (!existingTables.has('form_fields') && !existingTables.has('form_field')) {
        await db.form_field.sync();
        logger.info('[Migration] Created table: form_fields');
    } else {
        logger.info('[Migration] Table form_fields already exists - checking columns');
        await ensureFormFieldColumns(queryInterface);
    }

    if (!existingTables.has('form_submissions') && !existingTables.has('form_submission')) {
        await db.form_submission.sync();
        logger.info('[Migration] Created table: form_submissions');
    } else {
        logger.info('[Migration] Table form_submissions already exists - skipping');
    }

    if (!existingTables.has('form_answers') && !existingTables.has('form_answer')) {
        await db.form_answer.sync();
        logger.info('[Migration] Created table: form_answers');
    } else {
        logger.info('[Migration] Table form_answers already exists - skipping');
    }
}

/**
 * Phase 2/3: Add maxSubmissions + notifyOnSubmission columns to forms table
 */
async function ensureFormColumns(queryInterface) {
    try {
        const columns = await queryInterface.describeTable('forms');

        if (!columns.maxSubmissions) {
            await queryInterface.addColumn('forms', 'maxSubmissions', {
                type: db.Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
            });
            logger.info('[Migration] Added column forms.maxSubmissions');
        }

        if (!columns.notifyOnSubmission) {
            await queryInterface.addColumn('forms', 'notifyOnSubmission', {
                type: db.Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            });
            logger.info('[Migration] Added column forms.notifyOnSubmission');
        }
    } catch (err) {
        logger.warn('[Migration] Error checking/adding form columns:', err.message);
    }
}

/**
 * Phase 2/3: Add showIf column to form_fields table
 */
async function ensureFormFieldColumns(queryInterface) {
    try {
        const columns = await queryInterface.describeTable('form_fields');

        if (!columns.showIf) {
            await queryInterface.addColumn('form_fields', 'showIf', {
                type: db.Sequelize.JSON,
                allowNull: true,
                defaultValue: null,
            });
            logger.info('[Migration] Added column form_fields.showIf');
        }
    } catch (err) {
        logger.warn('[Migration] Error checking/adding form_field columns:', err.message);
    }
}

module.exports = {
    ensureFormTables
};
