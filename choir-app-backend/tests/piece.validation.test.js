const assert = require('assert');
const { validationResult } = require('express-validator');
const { createPieceValidation, updatePieceValidation } = require('../src/validators/piece.validation');

(async () => {
  try {
    const req1 = { body: { composerId: 1 } };
    for (const v of createPieceValidation) { await v.run(req1); }
    let res = validationResult(req1);
    assert.ok(!res.isEmpty(), 'create should fail without title');

    const reqNoComposer = { body: { title: 'X' } };
    for (const v of createPieceValidation) { await v.run(reqNoComposer); }
    res = validationResult(reqNoComposer);
    assert.ok(!res.isEmpty(), 'create should fail without composerId or origin');

    const req2 = { body: { title: 'X', arrangerIds: 'foo' } };
    for (const v of updatePieceValidation) { await v.run(req2); }
    res = validationResult(req2);
    assert.ok(!res.isEmpty(), 'update should fail with invalid arrangerIds');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
