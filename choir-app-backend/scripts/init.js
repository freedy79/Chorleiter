require('dotenv').config();
const { init } = require('../src/init');
const logger = require("../src/config/logger");

init().then(() => {
    logger.info('Initialization completed.');
    process.exit(0);
}).catch(err => {
    logger.error('Initialization failed:', err);
    process.exit(1);
});
