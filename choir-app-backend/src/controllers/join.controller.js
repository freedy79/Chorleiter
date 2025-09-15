const db = require('../models');
const bcrypt = require('bcryptjs');
const emailService = require('../services/email.service');

exports.getJoinInfo = async (req, res) => {
  try {
    const choir = await db.choir.findOne({ where: { joinHash: req.params.token } });
    if (!choir || !choir.modules || !choir.modules.joinByLink) {
      return res.status(404).send({ message: 'Join link not found.' });
    }
    res.status(200).send({ choirName: choir.name });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.joinChoir = async (req, res) => {
  const { firstName, name, email, password } = req.body;
  if (!firstName || !name || !email || !password) {
    return res.status(400).send({ message: 'First name, last name, email and password are required.' });
  }
  try {
    const choir = await db.choir.findOne({ where: { joinHash: req.params.token } });
    if (!choir || !choir.modules || !choir.modules.joinByLink) {
      return res.status(404).send({ message: 'Join link not found.' });
    }
    const existing = await db.user.findOne({ where: { email } });
    if (existing) return res.status(409).send({ message: 'User already exists.' });
    const user = await db.user.create({ firstName, name, email, password: bcrypt.hashSync(password, 8), roles: ['singer'] });
    await choir.addUser(user, { through: { rolesInChoir: ['singer'], registrationStatus: 'REGISTERED' } });
    await emailService.sendNewMemberNotification(choir.id, user);
    res.status(201).send({ message: 'Registration completed.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
