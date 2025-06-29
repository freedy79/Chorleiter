const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (err) {
    return 'unknown';
  }
}

const commit = getGitCommit();
const buildDate = new Date().toISOString();
const version = require('../package.json').version;

const content = `export const buildInfo = {
  version: '${version}',
  commit: '${commit}',
  date: '${buildDate}'
};
`;

const outFile = path.join(__dirname, '..', 'src', 'environments', 'build-info.ts');
fs.writeFileSync(outFile, content);
console.log(`Generated ${outFile}`);


