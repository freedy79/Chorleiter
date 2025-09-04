const assert = require('assert');
const nodemailer = require('nodemailer');

let createdOptions;
nodemailer.createTransport = (opts) => {
  createdOptions = opts;
  return { sendMail: (mailOpts) => Promise.resolve(mailOpts) };
};

const { sendMail } = require('../src/services/emailTransporter');

(async () => {
  try {
    let result = await sendMail(
      { to: 'a@b.c', subject: 'sub', html: '<p>hi</p>', text: 'hi' },
      { host: 'smtp.example.com', port: 25, user: 'u', pass: 'p', fromAddress: 'from@example.com' }
    );
    assert.strictEqual(createdOptions.host, 'smtp.example.com');
    assert.strictEqual(result.to, 'a@b.c');
    assert.strictEqual(result.from.address, 'from@example.com');
    assert.strictEqual(result.bcc, undefined);

    const recipients = ['one@example.com', 'two@example.com', 'three@example.com'];
    result = await sendMail(
      { to: recipients, subject: 'sub', html: '<p>hi</p>', text: 'hi' },
      { host: 'smtp.example.com', port: 25, user: 'u', pass: 'p', fromAddress: 'from@example.com' }
    );
    assert.strictEqual(result.to, 'no-reply@nak-chorleiter.de');
    assert.deepStrictEqual(result.bcc, recipients);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
