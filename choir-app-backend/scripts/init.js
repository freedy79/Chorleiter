const { init } = require('../src/init');

init().then(() => {
    console.log('Initialization completed.');
}).catch(err => {
    console.error('Initialization failed:', err);
    process.exit(1);
});
