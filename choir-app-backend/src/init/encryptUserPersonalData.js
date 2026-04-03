const db = require('../models');
const logger = require('../config/logger');
const { encryptGCM, decryptGCM } = require('../services/encryption.service');

/**
 * Migration: encrypt sensitive personal fields in the users table.
 *
 * Fields encrypted: phone, street, postalCode, city, congregation, district
 * Fields intentionally skipped:
 *   - email        → used as login lookup key; requires a blind-index refactor
 *   - name/firstName → may be used in member-search queries
 *   - voice        → ENUM, minimal sensitivity
 *
 * Detection: encrypted values are prefixed with "enc:" so the migration and
 * the model hooks can distinguish ciphertext from plaintext and remain idempotent.
 *
 * The migration is gated by a system_settings flag ("user_pii_encrypted_v1")
 * so it never re-runs after the first successful pass.
 */

const MIGRATION_FLAG = 'user_pii_encrypted_v1';
const ENC_PREFIX = 'enc:';
const PII_FIELDS = ['phone', 'street', 'postalCode', 'city', 'congregation', 'district'];

async function encryptUserPersonalData() {
    try {
        // Check if migration has already been applied
        const flag = await db.system_setting.findByPk(MIGRATION_FLAG).catch(() => null);
        if (flag?.value === 'true') {
            return;
        }

        // Fetch all users with only the relevant fields
        const users = await db.user.findAll({
            attributes: ['id', ...PII_FIELDS],
            raw: true,
        });

        let encrypted = 0;
        let skipped = 0;

        for (const user of users) {
            const updates = {};

            for (const field of PII_FIELDS) {
                const val = user[field];
                if (!val) continue;

                if (val.startsWith(ENC_PREFIX)) {
                    // Already encrypted by a previous (partial) run
                    skipped++;
                    continue;
                }

                const ciphertext = encryptGCM(val);
                if (ciphertext) {
                    updates[field] = ENC_PREFIX + ciphertext;
                }
            }

            if (Object.keys(updates).length > 0) {
                // hooks: false prevents the beforeUpdate hook from double-encrypting
                await db.user.update(updates, {
                    where: { id: user.id },
                    hooks: false,
                    individualHooks: false,
                });
                encrypted++;
            }
        }

        // Mark migration as complete
        await db.system_setting.upsert({ key: MIGRATION_FLAG, value: 'true' });

        logger.info(
            `[Migration] encryptUserPersonalData: encrypted ${encrypted} users, skipped ${skipped} already-encrypted rows.`
        );
    } catch (err) {
        logger.error('[Migration] encryptUserPersonalData failed:', err.message);
        // Non-fatal: app continues, migration will retry on next startup
    }
}

/**
 * Helpers exported so the user model hooks can use the same prefix/logic.
 */
function encryptPiiField(val) {
    if (!val || val.startsWith(ENC_PREFIX)) return val;
    const ciphertext = encryptGCM(val);
    return ciphertext ? ENC_PREFIX + ciphertext : val;
}

function decryptPiiField(val) {
    if (!val || !val.startsWith(ENC_PREFIX)) return val;
    return decryptGCM(val.slice(ENC_PREFIX.length)) ?? val;
}

module.exports = { encryptUserPersonalData, encryptPiiField, decryptPiiField, PII_FIELDS };
