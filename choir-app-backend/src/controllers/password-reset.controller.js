const db = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/email.service');

exports.requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).send({ message: 'Email is required.' });
  }
  try {
    if (email === 'demo@nak-chorleiter.de') {
      return res.status(403).send({ message: 'Demo user cannot reset password.' });
    }
    const user = await db.user.findOne({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.update({ resetToken: token, resetTokenExpiry: expiry });
      await emailService.sendPasswordResetMail(email, token, user.name);
    }
    res.status(200).send({ message: 'If registered, you will receive an email with a reset link.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.validateToken = async (req, res) => {
  const { token } = req.params;
  try {
    const user = await db.user.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });
    if (!user) {
      return res.status(400).send({ message: 'Invalid or expired token.' });
    }
    res.status(200).send({ message: 'Token is valid.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) {
    return res.status(400).send({ message: 'Password is required.' });
  }
  try {
    const user = await db.user.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: { [Op.gt]: new Date() }
      }
    });
    if (!user) {
      return res.status(400).send({ message: 'Invalid or expired token.' });
    }
    if (user.email === 'demo@nak-chorleiter.de') {
      return res.status(403).send({ message: 'Demo user cannot reset password.' });
    }
    await user.update({
      password: bcrypt.hashSync(password, 8),
      resetToken: null,
      resetTokenExpiry: null
    });
    res.status(200).send({ message: 'Password updated.' });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};
