const fs = require('fs');
const path = require('path');
const service = require('../src/services/log.service');

(async () => {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    await fs.promises.mkdir(logDir, { recursive: true });

    const errorSample = `2025-07-01 08:00:00 [ERROR]: Something failed\n    at line`;
    await fs.promises.writeFile(path.join(logDir, 'error.log'), errorSample);

    const jsonSample = '{"date":"now","level":"error"}\n';
    await fs.promises.writeFile(path.join(logDir, 'exceptions.log'), jsonSample);

    const errorEntries = await service.readLogFile('error.log');
    const jsonEntries = await service.readLogFile('exceptions.log');

    if (!Array.isArray(errorEntries) || errorEntries.length !== 1) throw new Error('error log parse failed');
    if (!Array.isArray(jsonEntries) || jsonEntries.length !== 1) throw new Error('json log parse failed');

    console.log('log.service tests passed');
    fs.rmSync(logDir, { recursive: true, force: true });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
