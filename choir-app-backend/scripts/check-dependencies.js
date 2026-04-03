#!/usr/bin/env node

/**
 * Checks that all require() statements in src/ correspond to dependencies in package.json
 * This prevents deployment issues where locally-installed packages are not in dependencies
 */

const fs = require('fs');
const path = require('path');

// Built-in Node.js modules (don't need to be in package.json)
const BUILTIN_MODULES = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
  'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'querystring',
  'readline', 'stream', 'string_decoder', 'timers', 'tls', 'tty', 'url',
  'util', 'v8', 'vm', 'zlib'
]);

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function extractRequires(fileContent) {
  // Match require('package-name') but not require('./relative') or require('../relative')
  const requireRegex = /require\(['"]([^.'\/][^'"]*)['"]\)/g;
  const requires = new Set();

  let match;
  while ((match = requireRegex.exec(fileContent)) !== null) {
    // Extract package name (first part before /)
    const packageName = match[1].split('/')[0];
    if (!BUILTIN_MODULES.has(packageName)) {
      requires.add(packageName);
    }
  }

  return requires;
}

function main() {
  const srcDir = path.join(__dirname, '..', 'src');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');

  if (!fs.existsSync(srcDir)) {
    console.error('Error: src/ directory not found');
    process.exit(1);
  }

  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found');
    process.exit(1);
  }

  // Get all JavaScript files in src/
  const files = getAllFiles(srcDir);

  // Extract all required packages
  const allRequires = new Set();
  files.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const requires = extractRequires(content);
    requires.forEach((req) => allRequires.add(req));
  });

  // Load package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {})
  ]);

  // Find missing dependencies
  const missing = [...allRequires].filter((req) => !dependencies.has(req));

  if (missing.length > 0) {
    console.error('❌ ERROR: The following packages are required but not in package.json:');
    console.error('');
    missing.forEach((pkg) => {
      console.error(`  - ${pkg}`);
    });
    console.error('');
    console.error('Add them with:');
    console.error(`  npm install ${missing.join(' ')}`);
    console.error('');
    console.error('This is critical for deployment! See ARCHITECTURE.md for details.');
    process.exit(1);
  } else {
    console.log('✅ All require() statements match package.json dependencies');
  }
}

main();
