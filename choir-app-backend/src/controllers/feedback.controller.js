const db = require('../models');
const emailService = require('../services/email.service');

function normalizeSenderName(user) {
  return [user?.firstName, user?.name].filter(Boolean).join(' ').trim() || user?.email || 'Ein Benutzer';
}

exports.submitImprovementSuggestion = async (req, res) => {
  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).send({ message: 'message is required' });
  }

  try {
    const user = await db.user.findByPk(req.userId, {
      attributes: ['id', 'firstName', 'name', 'email']
    });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const admins = await db.user.findAll({
      attributes: ['email', 'roles']
    });
    const recipients = new Set(
      admins
        .filter(entry => Array.isArray(entry.roles) && entry.roles.includes('admin') && entry.email)
        .map(entry => entry.email)
    );
    if (user.email) {
      recipients.add(user.email);
    }

    await emailService.sendImprovementSuggestionMail([...recipients], {
      senderName: normalizeSenderName(user),
      senderEmail: user.email,
      message
    });

    res.status(200).send({ message: 'Verbesserungsvorschlag gesendet.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
