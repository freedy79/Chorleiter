const assert = require('assert');

/**
 * Helper to create a user with optional choir memberships for tests.
 *
 * @param {import('../../src/models')} db - The database models instance.
 * @param {Object} options
 * @param {string} options.email - Email for the new user.
 * @param {string[]} [options.globalRoles=['user']] - Global application roles.
 * @param {Object[]} [options.choirMemberships] - Choir specific roles.
 * @returns {Promise<import('../../src/models').user>} The persisted user instance.
 */
async function createUserWithRoles(db, { email, globalRoles = ['user'], choirMemberships = [], ...attributes }) {
  assert(email, 'Email is required for test users');
  const user = await db.user.create({ email, roles: globalRoles, ...attributes });

  for (const membership of choirMemberships) {
    if (!membership) continue;
    const { choirId, choir, rolesInChoir = ['singer'], ...rest } = membership;
    const resolvedChoirId = choirId ?? choir?.id;
    if (!resolvedChoirId) {
      throw new Error('choirMemberships entries require a choirId or choir with id');
    }
    await db.user_choir.create({
      userId: user.id,
      choirId: resolvedChoirId,
      rolesInChoir,
      ...rest
    });
  }

  return user;
}

module.exports = { createUserWithRoles };
