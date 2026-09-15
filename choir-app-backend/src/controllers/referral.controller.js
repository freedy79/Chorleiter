const db = require('../models');
const referralService = require('../services/referral.service');

exports.sendRecommendation = async (req, res, next) => {
  try {
    const senderUser = await db.user.findByPk(req.userId);
    if (!senderUser) {
      return res.status(404).send({ message: 'Benutzer nicht gefunden.' });
    }

    await referralService.createReferralInvitation(req, senderUser, req.body || {});

    if (req.body?.dismissPrompt === true) {
      const currentPrefs = senderUser.preferences || {};
      await senderUser.update({
        preferences: {
          ...currentPrefs,
          recommendPromptDismissed: true
        }
      });
    }

    return res.status(200).send({ message: 'Empfehlungs-Mail wurde versendet.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};

exports.startChoirRegistration = async (req, res, next) => {
  try {
    const { token } = req.params;
    const registrationRequest = await referralService.createChoirRegistrationRequest(req, token, req.body || {});
    return res.status(200).send({
      message: 'Verifizierungscode wurde per E-Mail gesendet.',
      requestId: registrationRequest.id
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};

exports.startPublicChoirRegistration = async (req, res, next) => {
  try {
    const registrationRequest = await referralService.createPublicChoirRegistrationRequest(req, req.body || {});
    return res.status(200).send({
      message: 'Verifizierungscode wurde per E-Mail gesendet.',
      requestId: registrationRequest.id
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};

exports.verifyChoirRegistration = async (req, res, next) => {
  try {
    const requestId = Number(req.params.requestId);
    const code = String(req.body?.code || '').trim();
    if (!Number.isInteger(requestId) || requestId <= 0 || !code) {
      return res.status(400).send({ message: 'Ungültige Anfrage.' });
    }

    await referralService.verifyChoirRegistrationRequest(req, requestId, code);
    return res.status(200).send({ message: 'E-Mail bestätigt. Anfrage wurde zur Admin-Freigabe eingereicht.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};

exports.listRegistrationRequests = async (req, res, next) => {
  try {
    const requests = await db.choir_registration_request.findAll({
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).send(requests);
  } catch (err) {
    return next(err);
  }
};

exports.approveRegistrationRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).send({ message: 'Ungültige Anfrage-ID.' });
    }

    const result = await referralService.approveChoirRegistrationRequest(req.userId, requestId);
    return res.status(200).send({
      message: 'Anfrage freigegeben und Chor angelegt.',
      choirId: result.choir.id,
      userId: result.user.id
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};

exports.rejectRegistrationRequest = async (req, res, next) => {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).send({ message: 'Ungültige Anfrage-ID.' });
    }

    await referralService.rejectChoirRegistrationRequest(req.userId, requestId, req.body?.reason);
    return res.status(200).send({ message: 'Anfrage wurde abgelehnt.' });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).send({ message: err.message });
    }
    return next(err);
  }
};
