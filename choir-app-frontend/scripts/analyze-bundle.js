#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 *
 * Phase 10: Performance Analysis
 * Analyzes the stats.json file generated from production build
 * to identify large bundles and optimization opportunities.
 */

const fs = require('fs');
const path = require('path');

// Try multiple possible locations for stats.json
const POSSIBLE_PATHS = [
  path.join(__dirname, '../dist/choir-app-frontend/stats.json'),
  path.join(__dirname, '../dist/choir-app-frontend/browser/stats.json'),
  path.join(__dirname, '../stats.json')
];

let STATS_FILE = null;
for (const statsPath of POSSIBLE_PATHS) {
  if (fs.existsSync(statsPath)) {
    STATS_FILE = statsPath;
    break;
  }
}
const SIZE_WARNING_THRESHOLD = 500 * 1024; // 500KB
const SIZE_ERROR_THRESHOLD = 1024 * 1024; // 1MB

console.log('🔍 Bundle Size Analysis - Phase 10 Performance Optimization\n');
console.log('=' .repeat(70));

if (!STATS_FILE) {
  console.error('❌ stats.json not found!');
  console.log('\nSearched in:');
  POSSIBLE_PATHS.forEach(p => console.log(`  - ${p}`));
  console.log('\nTo generate stats.json, run:');
  console.log('  ng build --stats-json');
  console.log('\nOr use the package script:');
  console.log('  npm run build:stats\n');
  process.exit(1);
}

console.log(`📂 Using stats file: ${STATS_FILE}\n`);

const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));

// Extract bundle information from esbuild metafile format (Angular 20)
// The stats.json contains "outputs" with all generated files
const bundles = [];

if (stats.outputs) {
  // esbuild metafile format from Angular 20 application builder
  Object.keys(stats.outputs).forEach(filePath => {
    const output = stats.outputs[filePath];

    // Only include .js files (skip .map files and other assets)
    if (!filePath.endsWith('.js')) {
      return;
    }

    const fileName = path.basename(filePath);
    const isEntry = output.entryPoint !== undefined;

    bundles.push({
      name: fileName,
      size: output.bytes || 0,
      chunkName: isEntry ? output.entryPoint : 'lazy',
      isInitial: isEntry
    });
  });
} else if (stats.chunks) {
  // Fallback to webpack format for backwards compatibility
  stats.chunks.forEach(chunk => {
    const files = chunk.files || [];
    const jsFiles = files.filter(f => f.endsWith('.js'));

    jsFiles.forEach(file => {
      const asset = stats.assets?.find(a => a.name === file);
      if (asset) {
        bundles.push({
          name: file,
          size: asset.size,
          chunkName: chunk.names?.[0] || 'unknown',
          isInitial: chunk.initial || false
        });
      }
    });
  });
}

// Sort by size (largest first)
bundles.sort((a, b) => b.size - a.size);

// Analyze bundles
console.log('\n📦 Bundle Analysis:\n');

let totalSize = 0;
let warnings = 0;
let errors = 0;

bundles.forEach((bundle, index) => {
  totalSize += bundle.size;
  const sizeMB = (bundle.size / (1024 * 1024)).toFixed(2);
  const sizeKB = (bundle.size / 1024).toFixed(2);

  let icon = '✅';
  let status = '';

  if (bundle.size > SIZE_ERROR_THRESHOLD) {
    icon = '❌';
    status = ' (TOO LARGE - Consider code splitting)';
    errors++;
  } else if (bundle.size > SIZE_WARNING_THRESHOLD) {
    icon = '⚠️';
    status = ' (Large - Review for optimization)';
    warnings++;
  }

  const initial = bundle.isInitial ? '[INITIAL]' : '[LAZY]';

  console.log(`${icon} ${initial.padEnd(10)} ${bundle.name.padEnd(40)} ${sizeKB.padStart(10)} KB${status}`);
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Summary:`);
console.log(`   Total Bundle Size: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
console.log(`   Number of Bundles: ${bundles.length}`);
console.log(`   Warnings: ${warnings}`);
console.log(`   Errors: ${errors}\n`);

// Recommendations
console.log('💡 Optimization Recommendations:\n');

if (errors > 0) {
  console.log('❌ CRITICAL: You have bundles larger than 1MB!');
  console.log('   • Consider lazy loading heavy modules');
  console.log('   • Split large components into separate chunks');
  console.log('   • Review dependencies and remove unused packages\n');
}

if (warnings > 0) {
  console.log('⚠️  WARNING: You have bundles larger than 500KB');
  console.log('   • Review these bundles for optimization opportunities');
  console.log('   • Consider code splitting for better performance\n');
}

if (errors === 0 && warnings === 0) {
  console.log('✅ All bundles are within acceptable size limits!');
  console.log('   • Good job on keeping bundle sizes optimized');
  console.log('   • Continue monitoring as you add features\n');
}

// Top modules by size
console.log('\n📈 Top 5 Largest Bundles:\n');
bundles.slice(0, 5).forEach((bundle, index) => {
  const sizeMB = (bundle.size / (1024 * 1024)).toFixed(2);
  console.log(`   ${index + 1}. ${bundle.name} - ${sizeMB} MB`);
});

console.log('\n' + '='.repeat(70));
console.log('\n✨ Analysis complete!\n');

// Exit with error code if there are critical issues
process.exit(errors > 0 ? 1 : 0);
