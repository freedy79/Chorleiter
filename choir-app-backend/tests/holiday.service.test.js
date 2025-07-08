const assert = require('assert');
const { isPublicHoliday } = require('../src/services/holiday.service');

(async () => {
  try {
    const gf = new Date('2025-04-18T00:00:00Z');
    const asc = new Date('2025-05-29T00:00:00Z');
    const xmas = new Date('2025-12-25T00:00:00Z');
    const entMarch = new Date('2025-03-02T00:00:00Z');
    const entJuly = new Date('2025-07-06T00:00:00Z');
    const entNov = new Date('2025-11-02T00:00:00Z');
    assert.ok(isPublicHoliday(gf));
    assert.ok(isPublicHoliday(asc));
    assert.ok(isPublicHoliday(xmas));
    assert.ok(isPublicHoliday(entMarch));
    assert.ok(isPublicHoliday(entJuly));
    assert.ok(isPublicHoliday(entNov));
    console.log('holiday.service tests passed');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
