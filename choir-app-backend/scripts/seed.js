const { seedDatabase } = require('../src/seed');

const includeDemo = process.env.INCLUDE_DEMO === 'true';

seedDatabase({ includeDemoData: includeDemo }).then(() => {
    console.log('Seeding completed.');
}).catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
