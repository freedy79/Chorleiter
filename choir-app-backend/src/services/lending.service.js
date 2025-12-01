const db = require('../models');
const emailService = require('./email.service');
const logger = require('../config/logger');

const Lending = db.lending;

const COPY_INCLUDES = [
  { model: db.user, as: 'borrower', attributes: ['id', 'name', 'firstName', 'email'] },
  { model: db.collection, as: 'collection', attributes: ['id', 'title'] },
  {
    model: db.library_item,
    as: 'libraryItem',
    include: [{ model: db.collection, as: 'collection', attributes: ['id', 'title'] }]
  }
];

function resolveCollectionTitle(copy) {
  return copy.collection?.title || copy.libraryItem?.collection?.title || 'Noten';
}

async function sendBorrowedMail(copy) {
  if (!copy?.borrower?.email) return;
  const details = {
    title: resolveCollectionTitle(copy),
    copyNumber: copy.copyNumber,
    borrowedAt: copy.borrowedAt || new Date(),
    borrowerName: copy.borrowerName || copy.borrower.name
  };

  try {
    await emailService.sendLendingBorrowedNotification(copy.borrower.email, details, copy.borrower);
  } catch (err) {
    logger.error(`Error sending borrowed notification for copy ${copy.id}: ${err.message}`);
    logger.error(err.stack);
  }
}

async function sendReturnedMail(copy, previousBorrower) {
  const borrower = previousBorrower || copy.borrower;
  if (!borrower?.email) return;

  const details = {
    title: resolveCollectionTitle(copy),
    copyNumber: copy.copyNumber,
    returnedAt: copy.returnedAt || new Date(),
    borrowerName: copy.borrowerName || borrower.name
  };

  try {
    await emailService.sendLendingReturnedNotification(borrower.email, details, borrower);
  } catch (err) {
    logger.error(`Error sending return notification for copy ${copy.id}: ${err.message}`);
    logger.error(err.stack);
  }
}

exports.updateBorrower = async (id, payload = {}) => {
  const copy = await Lending.findByPk(id, { include: COPY_INCLUDES });
  if (!copy) return null;

  const { borrowerName, borrowerId } = payload;
  const data = {};
  let event = null;
  let previousBorrower = null;

  if (borrowerName !== undefined) {
    data.borrowerName = borrowerName;
    data.status = borrowerName ? 'borrowed' : 'available';
    if (borrowerName) {
      data.borrowedAt = new Date();
      data.returnedAt = null;
      if (borrowerId !== undefined) data.borrowerId = borrowerId;
      event = 'borrowed';
    } else {
      data.returnedAt = new Date();
      data.borrowerId = null;
      previousBorrower = copy.borrower;
      event = 'returned';
    }
  } else if (borrowerId !== undefined) {
    data.borrowerId = borrowerId;
  }

  await copy.update(data);

  const updatedCopy = await Lending.findByPk(id, { include: COPY_INCLUDES });

  if (event === 'borrowed') {
    await sendBorrowedMail(updatedCopy);
  } else if (event === 'returned') {
    await sendReturnedMail(updatedCopy, previousBorrower);
  }

  return updatedCopy;
};

exports.getCopyWithDetails = (id) => Lending.findByPk(id, { include: COPY_INCLUDES });
