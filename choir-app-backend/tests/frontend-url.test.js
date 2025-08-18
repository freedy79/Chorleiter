const assert = require('assert');
// Mock the models module to avoid real DB connections
const mockDb = { system_setting: { findByPk: async () => ({ value: 'https://example.com/#/' }) } };
require.cache[require.resolve('../src/models')] = { exports: mockDb };
const { getFrontendUrl } = require('../src/utils/frontend-url');

(async () => {
  try {
    mockDb.system_setting.findByPk = async () => ({ value: 'https://example.com/#/' });
    let url = await getFrontendUrl();
    assert.strictEqual(url, 'https://example.com');

    mockDb.system_setting.findByPk = async () => null;
    process.env.FRONTEND_URL = 'https://foo.bar/app/';
    url = await getFrontendUrl();
    assert.strictEqual(url, 'https://foo.bar/app');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
