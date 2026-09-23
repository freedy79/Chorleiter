const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const frontendRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(frontendRoot, 'dist', 'choir-app-frontend', 'browser');
const fingerprintPath = path.join(outputDirectory, '.build-input-hash');
const generatedBuildInfoPath = 'src/environments/build-info.ts';

const inputRoots = [
  'src',
  'public',
  'angular.json',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.spec.json',
  'ngsw-config.json',
];

function collectFiles(relativePath) {
  if (relativePath.replace(/\\/g, '/') === generatedBuildInfoPath) {
    return [];
  }

  const absolutePath = path.join(frontendRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [];
  }

  const stats = fs.statSync(absolutePath);
  if (stats.isFile()) {
    return [relativePath.replace(/\\/g, '/')];
  }

  return fs.readdirSync(absolutePath, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(relativePath, entry.name)))
    .sort();
}

function calculateInputHash() {
  const files = inputRoots.flatMap(collectFiles).sort();
  const hash = crypto.createHash('sha256');

  for (const relativePath of files) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(frontendRoot, relativePath)));
    hash.update('\0');
  }

  return hash.digest('hex');
}

function readStoredHash() {
  try {
    return fs.readFileSync(fingerprintPath, 'utf8').trim();
  } catch {
    return null;
  }
}

function run(command, args) {
  const result = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', command, ...args], {
      cwd: frontendRoot,
      stdio: 'inherit',
    })
    : spawnSync(command, args, {
      cwd: frontendRoot,
      stdio: 'inherit',
    });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const inputHash = calculateInputHash();
if (fs.existsSync(outputDirectory) && readStoredHash() === inputHash) {
  console.log('Frontend build is up-to-date. Skipping Angular build.');
  process.exit(0);
}

console.log('Frontend build inputs changed. Building Angular frontend...');
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['ng', 'build', ...process.argv.slice(2)]);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(fingerprintPath, `${inputHash}\n`);
console.log(`Stored frontend build fingerprint in ${fingerprintPath}`);
