const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const referralService = require('../src/services/referral.service');
const emailService = require('../src/services/email.service');

function makeReq(ip = '127.0.0.1') {
  return {
    ip,
    headers: {},
    get: () => 'test-agent'
  };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    await db.user.create({
      firstName: 'Admin',
      name: 'Admin',
      email: 'admin@example.com',
      password: 'x',
      roles: ['admin']
    });

    let sentCode = null;
    let approvalDecisionMail = null;
    let rejectionDecisionMail = null;
    emailService.sendChoirRegistrationVerificationCodeMail = async ({ code }) => {
      sentCode = code;
    };
    emailService.sendAdminChoirRegistrationRequestMail = async () => {};
    emailService.sendChoirRegistrationDecisionMail = async (payload) => {
      if (payload.approved) {
        approvalDecisionMail = payload;
      } else {
        rejectionDecisionMail = payload;
      }
    };

    const start = await referralService.createPublicChoirRegistrationRequest(makeReq(), {
      requesterName: 'Max Mustermann',
      requesterEmail: 'max@example.com',
      requesterPhone: '0123456789',
      choirName: 'Testchor',
      city: 'Hannover'
    });

    assert.ok(start.id > 0, 'request should be created');
    assert.ok(sentCode, 'verification code should be sent');

    const verified = await referralService.verifyChoirRegistrationRequest(makeReq(), start.id, sentCode);
    assert.ok(verified.emailVerifiedAt, 'request should be verified');

    const approved = await referralService.approveChoirRegistrationRequest(1, start.id);
    assert.ok(approved.choir.id > 0, 'choir should be created');
    assert.ok(approved.user.id > 0, 'user should be created');
    assert.strictEqual(approved.createdNewUser, true, 'should indicate newly created user');
    assert.ok(approved.passwordSetupToken, 'newly created user should get setup token');

    const requestAfter = await db.choir_registration_request.findByPk(start.id);
    assert.strictEqual(requestAfter.status, 'APPROVED', 'request should be approved');

    const membership = await db.user_choir.findOne({ where: { userId: approved.user.id, choirId: approved.choir.id } });
    assert.ok(membership, 'membership should exist');
    assert.ok(Array.isArray(membership.rolesInChoir) && membership.rolesInChoir.includes('choir_admin'), 'user should be choir_admin');

    const createdUser = await db.user.findByPk(approved.user.id);
    assert.ok(createdUser.resetToken, 'created user should have reset token for password setup');
    assert.ok(createdUser.resetTokenExpiry, 'created user should have reset token expiry');

    assert.ok(approvalDecisionMail, 'approval decision mail should be sent');
    assert.strictEqual(approvalDecisionMail.to, 'max@example.com', 'approval mail should go to requester');
    assert.strictEqual(approvalDecisionMail.approved, true, 'approval mail should be marked approved');
    assert.ok(approvalDecisionMail.setupPasswordLink, 'approval mail should contain password setup link');

    const second = await referralService.createPublicChoirRegistrationRequest(makeReq('127.0.0.2'), {
      requesterName: 'Erika Beispiel',
      requesterEmail: 'erika@example.com',
      requesterPhone: '0987654321',
      choirName: 'Ablehnungschor',
      city: 'Berlin'
    });

    assert.ok(second.id > 0, 'second request should be created');

    const secondVerified = await referralService.verifyChoirRegistrationRequest(makeReq('127.0.0.2'), second.id, sentCode);
    assert.ok(secondVerified.emailVerifiedAt, 'second request should be verified');

    await referralService.rejectChoirRegistrationRequest(1, second.id, 'Unvollständige Angaben');

    const secondAfter = await db.choir_registration_request.findByPk(second.id);
    assert.strictEqual(secondAfter.status, 'REJECTED', 'second request should be rejected');
    assert.ok(rejectionDecisionMail, 'rejection decision mail should be sent');
    assert.strictEqual(rejectionDecisionMail.to, 'erika@example.com', 'rejection mail should go to requester');
    assert.strictEqual(rejectionDecisionMail.approved, false, 'rejection mail should be marked rejected');
    assert.strictEqual(rejectionDecisionMail.rejectionReason, 'Unvollständige Angaben', 'rejection reason should be forwarded');

    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
