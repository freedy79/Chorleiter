const db = require('../models');
const bcrypt = require('bcryptjs');

exports.getJoinInfo = async (req, res) => {
  try {
    const choir = await db.choir.findOne({ where: { joinHash: req.params.token } });
    if (!choir) return res.status(404).send({ message: 'Join link not found.' });
    res.status(200).send({ choirName: choir.name });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.joinChoir = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send({ message: 'Name, email and password are required.' });
  }
  try {
    const choir = await db.choir.findOne({ where: { joinHash: req.params.token } });
    if (!choir) return res.status(404).send({ message: 'Join link not found.' });
    const existing = await db.user.findOne({ where: { email } });
    if (existing) return res.status(409).send({ message: 'User already exists.' });
    const user = await db.user.create({ name, email, password: bcrypt.hashSync(password, 8), role: 'singer' });
    await choir.addUser(user, { through: { roleInChoir: 'singer', registrationStatus: 'REGISTERED' } });
    res.status(201).send({ message: 'Registration completed.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
