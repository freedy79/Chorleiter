const db = require('../models');

async function assignAdminRole() {
    const email = 'm.free@nak-goettingen.de';
    try {
        const user = await db.user.findOne({ where: { email } });
        if (!user) {
            return;
        }
        let roles = Array.isArray(user.roles) ? [...user.roles] : [];
        if (!roles.includes('admin')) {
            roles.push('admin');
            user.roles = roles;
            await user.save();
            console.log(`Added admin role to ${email}.`);
        }
    } catch (err) {
        console.error('Failed to assign admin role:', err);
    }
}

module.exports = { assignAdminRole };
