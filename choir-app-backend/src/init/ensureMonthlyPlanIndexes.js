const db = require('../models');
const logger = require('../config/logger');

const MONTHLY_PLAN_INDEX_NAME = 'monthly_plan_choir_year_month_unique';
const PLAN_ENTRY_INDEX_NAME = 'plan_entry_monthly_plan_date';

function resolveTableName(table) {
    if (typeof table === 'string') {
        return table;
    }
    const { schema, tableName } = table;
    return schema ? `${schema}.${tableName}` : tableName;
}

async function ensureIndex(queryInterface, tableName, options) {
    const { name } = options;
    let indexes;
    try {
        indexes = await queryInterface.showIndex(tableName);
    } catch (error) {
        if (error.name === 'SequelizeDatabaseError' && /does not exist|no such table/i.test(error.message)) {
            logger.debug(`${tableName} table does not exist, skipping index ${name}`);
            return;
        }
        throw error;
    }

    const indexExists = indexes.some((index) => index.name === name);
    if (indexExists) {
        logger.debug(`Index ${name} already exists on ${tableName}`);
        return;
    }

    logger.info(`Creating index ${name} on ${tableName}`);
    await queryInterface.addIndex(tableName, options.fields, options);
}

async function ensureMonthlyPlanIndexes() {
    const queryInterface = db.sequelize.getQueryInterface();
    const monthlyPlanTable = resolveTableName(db.monthly_plan.getTableName());
    const planEntryTable = resolveTableName(db.plan_entry.getTableName());

    await db.sequelize.transaction(async (transaction) => {
        await ensureIndex(queryInterface, monthlyPlanTable, {
            name: MONTHLY_PLAN_INDEX_NAME,
            unique: true,
            fields: ['choirId', 'year', 'month'],
            transaction,
        });

        await ensureIndex(queryInterface, planEntryTable, {
            name: PLAN_ENTRY_INDEX_NAME,
            unique: false,
            fields: ['monthlyPlanId', 'date'],
            transaction,
        });
    });
}

module.exports = { ensureMonthlyPlanIndexes };
