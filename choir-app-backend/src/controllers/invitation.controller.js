const db = require("../models");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

async function validateToken(token) {
  return await db.user_choir.findOne({
    where: {
      inviteToken: token,
      inviteExpiry: { [Op.gt]: new Date() },
      registrationStatus: 'PENDING'
    },
    include: [{ model: db.user, attributes: ['email', 'id'] }, { model: db.choir, attributes: ['name'] }]
  });
}

exports.getInvitation = async (req, res) => {
  try {
    const entry = await validateToken(req.params.token);
    if (!entry) {
      return res.status(404).send({ message: 'Invitation not found or expired.' });
    }
    res.status(200).send({
      email: entry.user.email,
      choirName: entry.choir.name,
      expiresAt: entry.inviteExpiry
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.completeRegistration = async (req, res) => {
  const token = req.params.token;
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).send({ message: 'Name and password are required.' });
  }
  try {
    const entry = await validateToken(token);
    if (!entry) {
      return res.status(404).send({ message: 'Invitation not found or expired.' });
    }
    await db.user.update({ name, password: bcrypt.hashSync(password, 8) }, { where: { id: entry.user.id } });
    await entry.update({ registrationStatus: 'REGISTERED', inviteToken: null, inviteExpiry: null });
    res.status(200).send({ message: 'Registration completed.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
