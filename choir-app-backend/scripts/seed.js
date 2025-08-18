const { seedDatabase } = require('../src/seed');
const logger = require("../src/config/logger");

const includeDemo = process.env.INCLUDE_DEMO === 'true';

seedDatabase({ includeDemoData: includeDemo }).then(() => {
    logger.info('Seeding completed.');
}).catch(err => {
    logger.error('Seeding failed:', err);
    process.exit(1);
});
