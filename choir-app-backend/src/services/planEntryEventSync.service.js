const db = require('../models');
const { Op, fn, col, where } = require('sequelize');
const { isoDateString, parseDateOnly } = require('../utils/date.utils');

const EVENT_TYPE_DEFAULT_NOTES = {
  SERVICE: 'Gottesdienst',
  REHEARSAL: 'Chorprobe'
};

function normalizeEventType(value, fallbackNotes = '') {
  if (value === 'SERVICE' || value === 'REHEARSAL') {
    return value;
  }

  const notes = String(fallbackNotes || '').toLowerCase();
  if (/\b(chorprobe|probe|cp)\b/.test(notes)) {
    return 'REHEARSAL';
  }
  return 'SERVICE';
}

function defaultNotesForEventType(eventType) {
  return EVENT_TYPE_DEFAULT_NOTES[eventType] || EVENT_TYPE_DEFAULT_NOTES.SERVICE;
}

async function loadPlanEntry(planEntryId, transaction) {
  return db.plan_entry.findByPk(planEntryId, {
    include: [
      {
        model: db.monthly_plan,
        as: 'monthlyPlan',
        attributes: ['id', 'choirId', 'year', 'month']
      }
    ],
    transaction
  });
}

async function findExistingEventByDateAndType({ choirId, date, type, transaction }) {
  const dateOnly = isoDateString(parseDateOnly(date));
  return db.event.findOne({
    where: {
      choirId,
      type,
      [Op.and]: [where(fn('date', col('date')), dateOnly)]
    },
    order: [['id', 'ASC']],
    transaction
  });
}

async function attachPlanEntryToEvent(planEntry, event, transaction) {
  if (Number(planEntry.linkedEventId) === Number(event.id)) {
    return event;
  }
  await planEntry.update({ linkedEventId: event.id }, { transaction, silent: true });
  return event;
}

async function syncPlanEntryEvent(planEntryInput, options = {}) {
  const transaction = options.transaction;
  const planEntry = planEntryInput?.monthlyPlan ? planEntryInput : await loadPlanEntry(planEntryInput.id || planEntryInput, transaction);
  if (!planEntry || !planEntry.monthlyPlan?.choirId) {
    return null;
  }

  const choirId = planEntry.monthlyPlan.choirId;
  const eventType = normalizeEventType(planEntry.eventType, planEntry.notes);
  const targetDate = parseDateOnly(planEntry.date);
  const notes = (planEntry.notes && String(planEntry.notes).trim()) || defaultNotesForEventType(eventType);

  let event = null;
  if (planEntry.linkedEventId) {
    event = await db.event.findByPk(planEntry.linkedEventId, { transaction });
    if (event && Number(event.choirId) !== Number(choirId)) {
      event = null;
    }
  }

  if (!event) {
    event = await findExistingEventByDateAndType({ choirId, date: planEntry.date, type: eventType, transaction });
  }

  const eventPayload = {
    date: targetDate,
    type: eventType,
    notes,
    choirId,
    directorId: planEntry.directorId || null,
    organistId: planEntry.organistId || null,
    monthlyPlanId: planEntry.monthlyPlanId || null,
    programId: planEntry.programId || null
  };

  if (event) {
    await event.update(eventPayload, { transaction, silent: true });
  } else {
    event = await db.event.create({
      ...eventPayload,
      finalized: false,
      version: 1
    }, { transaction });
  }

  await attachPlanEntryToEvent(planEntry, event, transaction);
  return event;
}

async function unlinkPlanEntryEvent(planEntryInput, options = {}) {
  const transaction = options.transaction;
  const planEntry = planEntryInput?.monthlyPlan ? planEntryInput : await loadPlanEntry(planEntryInput.id || planEntryInput, transaction);
  if (!planEntry) {
    return;
  }

  if (planEntry.linkedEventId) {
    await db.event.destroy({ where: { id: planEntry.linkedEventId }, transaction });
  }
}

module.exports = {
  normalizeEventType,
  defaultNotesForEventType,
  syncPlanEntryEvent,
  unlinkPlanEntryEvent
};
