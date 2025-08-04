const assert = require('assert');
const { validationResult } = require('express-validator');
const { createCollectionValidation, updateCollectionValidation } = require('../src/validators/collection.validation');

(async () => {
  try {
    const req1 = { body: {} };
    for (const v of createCollectionValidation) { await v.run(req1); }
    let res = validationResult(req1);
    assert.ok(!res.isEmpty(), 'create should fail without title');

    const req2 = { body: { title: 'A', pieces: 'x' } };
    for (const v of updateCollectionValidation) { await v.run(req2); }
    res = validationResult(req2);
    assert.ok(!res.isEmpty(), 'update should fail when pieces is not array');

    const req3 = { body: { title: 'A', subtitle: 123 } };
    for (const v of createCollectionValidation) { await v.run(req3); }
    res = validationResult(req3);
    assert.ok(!res.isEmpty(), 'create should fail when subtitle is not string');

    console.log('collection.validation tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
