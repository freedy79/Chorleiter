const db = require('../models');
const logger = require('../config/logger');
const { syncPlanEntryEvent, normalizeEventType, defaultNotesForEventType } = require('../services/planEntryEventSync.service');

function resolveTableName(table) {
    if (typeof table === 'string') {
        return table;
    }
    const { schema, tableName } = table;
    return schema ? `${schema}.${tableName}` : tableName;
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
    const description = await queryInterface.describeTable(tableName);
    if (description[columnName]) {
        return true;
    }
    logger.info(`Adding column ${columnName} to ${tableName}`);
    await queryInterface.addColumn(tableName, columnName, definition);
    return true;
}

async function describeTableSafe(queryInterface, tableName) {
    try {
        return await queryInterface.describeTable(tableName);
    } catch (error) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('does not exist') || message.includes('no such table')) {
            logger.debug(`[Migration] Table ${tableName} does not exist yet, skipping.`);
            return null;
        }
        throw error;
    }
}

async function ensurePlanEntryEventSyncFields(options = {}) {
    const { skipDataSync = false } = options;
    const queryInterface = db.sequelize.getQueryInterface();
    const planEntryTable = resolveTableName(db.plan_entry.getTableName());
    const planRuleTable = resolveTableName(db.plan_rule.getTableName());

    const planEntryDescription = await describeTableSafe(queryInterface, planEntryTable);
    const planRuleDescription = await describeTableSafe(queryInterface, planRuleTable);

    const hasPlanEntryTable = Boolean(planEntryDescription);
    const hasPlanRuleTable = Boolean(planRuleDescription);

    if (hasPlanEntryTable) {
        await ensureColumn(queryInterface, planEntryTable, 'event_type', {
            type: db.Sequelize.STRING,
            allowNull: false,
            defaultValue: 'SERVICE'
        });

        await ensureColumn(queryInterface, planEntryTable, 'linked_event_id', {
            type: db.Sequelize.INTEGER,
            allowNull: true
        });
    }

    if (hasPlanRuleTable) {
        await ensureColumn(queryInterface, planRuleTable, 'event_type', {
            type: db.Sequelize.STRING,
            allowNull: false,
            defaultValue: 'SERVICE'
        });
    }

    if (skipDataSync || (!hasPlanEntryTable && !hasPlanRuleTable)) {
        return;
    }

    await db.sequelize.transaction(async (transaction) => {
        if (hasPlanRuleTable) {
            const rules = await db.plan_rule.findAll({ transaction });
            for (const rule of rules) {
                const nextType = normalizeEventType(rule.eventType, rule.notes);
                const nextNotes = rule.notes && String(rule.notes).trim()
                    ? rule.notes
                    : defaultNotesForEventType(nextType);
                if (rule.eventType !== nextType || rule.notes !== nextNotes) {
                    await rule.update({ eventType: nextType, notes: nextNotes }, { transaction, silent: true });
                }
            }
        }

        if (hasPlanEntryTable) {
            const entries = await db.plan_entry.findAll({
                include: [{ model: db.monthly_plan, as: 'monthlyPlan', attributes: ['id', 'choirId'] }],
                transaction
            });

            for (const entry of entries) {
                const nextType = normalizeEventType(entry.eventType, entry.notes);
                const nextNotes = entry.notes && String(entry.notes).trim()
                    ? entry.notes
                    : defaultNotesForEventType(nextType);
                if (entry.eventType !== nextType || entry.notes !== nextNotes) {
                    await entry.update({ eventType: nextType, notes: nextNotes }, { transaction, silent: true });
                }
                if (entry.monthlyPlan?.choirId) {
                    await syncPlanEntryEvent(entry, { transaction });
                }
            }
        }
    });
}

module.exports = { ensurePlanEntryEventSyncFields };
