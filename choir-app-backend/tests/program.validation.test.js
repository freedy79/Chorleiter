const assert = require('assert');
const { validationResult } = require('express-validator');
const { programItemFreePieceValidation } = require('../src/validators/program.validation');

(async () => {
  try {
    const invalidReq = { body: { title: 'X', instrument: 'Piano123' } };
    for (const v of programItemFreePieceValidation) {
      await v.run(invalidReq);
    }
    let res = validationResult(invalidReq);
    assert.ok(!res.isEmpty(), 'should fail when instrument contains digits');

    const emptyReq = { body: { title: 'X', instrument: '' } };
    for (const v of programItemFreePieceValidation) {
      await v.run(emptyReq);
    }
    res = validationResult(emptyReq);
    assert.ok(res.isEmpty(), 'should pass when instrument is empty');

    const validReq = { body: { title: 'X', instrument: 'Piano Solo' } };
    for (const v of programItemFreePieceValidation) {
      await v.run(validReq);
    }
    res = validationResult(validReq);
    assert.ok(res.isEmpty(), 'should pass with valid instrument');
    console.log('program validation tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
