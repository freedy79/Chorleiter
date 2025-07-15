const crypto = require('crypto');
const db = require('../models');

async function ensureJoinHashes() {
    const choirs = await db.choir.findAll({ where: { joinHash: null } });
    for (const choir of choirs) {
        choir.joinHash = crypto.randomBytes(12).toString('hex');
        await choir.save();
    }
    if (choirs.length > 0) {
        console.log(`Generated join hashes for ${choirs.length} choirs.`);
    }
}

module.exports = { ensureJoinHashes };
