const { init } = require('../src/init');
const logger = require("../src/config/logger");

init().then(() => {
    logger.info('Initialization completed.');
}).catch(err => {
    logger.error('Initialization failed:', err);
    process.exit(1);
});
