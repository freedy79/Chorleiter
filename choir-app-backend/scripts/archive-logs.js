#!/usr/bin/env node
/**
 * Archive current logs into a dated subdirectory and clean old archives
 * Usage: node scripts/archive-logs.js
 */

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', 'logs');
const KEEP_ARCHIVES = 10;

function getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function archiveLogs() {
    console.log('Starting log archival...');

    ensureDir(LOGS_DIR);

    const dateStr = getDateString();
    const archiveDir = path.join(LOGS_DIR, dateStr);

    // If archive dir already exists, append timestamp to avoid conflicts
    let finalArchiveDir = archiveDir;
    if (fs.existsSync(archiveDir)) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        finalArchiveDir = `${archiveDir}_${timestamp.split('T')[1].replace(/:/g, '')}`;
    }

    ensureDir(finalArchiveDir);

    // Get all log files (not directories)
    const files = fs.readdirSync(LOGS_DIR);
    const logFiles = files.filter(file => {
        const filePath = path.join(LOGS_DIR, file);
        return fs.statSync(filePath).isFile() && file.endsWith('.log');
    });

    if (logFiles.length === 0) {
        console.log('No log files to archive.');
    } else {
        console.log(`Archiving ${logFiles.length} log file(s) to ${path.basename(finalArchiveDir)}/`);

        // Move log files to archive directory
        for (const file of logFiles) {
            const sourcePath = path.join(LOGS_DIR, file);
            const destPath = path.join(finalArchiveDir, file);
            try {
                fs.renameSync(sourcePath, destPath);
                console.log(`  Moved: ${file}`);
            } catch (err) {
                console.error(`  Failed to move ${file}:`, err.message);
            }
        }
    }

    // Clean old archives
    cleanOldArchives();

    console.log('Log archival completed.');
}

function cleanOldArchives() {
    const files = fs.readdirSync(LOGS_DIR);

    // Get all archive directories (format: yyyymmdd or yyyymmdd_hhmmss)
    const archives = files.filter(file => {
        const filePath = path.join(LOGS_DIR, file);
        return fs.statSync(filePath).isDirectory() && /^\d{8}/.test(file);
    });

    if (archives.length <= KEEP_ARCHIVES) {
        console.log(`Found ${archives.length} archive(s), keeping all (max: ${KEEP_ARCHIVES})`);
        return;
    }

    // Sort by name (which is date-based) - oldest first
    archives.sort();

    // Delete oldest archives
    const toDelete = archives.slice(0, archives.length - KEEP_ARCHIVES);
    console.log(`Found ${archives.length} archive(s), deleting ${toDelete.length} oldest:`);

    for (const archive of toDelete) {
        const archivePath = path.join(LOGS_DIR, archive);
        try {
            // Recursively delete directory
            fs.rmSync(archivePath, { recursive: true, force: true });
            console.log(`  Deleted: ${archive}`);
        } catch (err) {
            console.error(`  Failed to delete ${archive}:`, err.message);
        }
    }
}

// Run if called directly
if (require.main === module) {
    archiveLogs();
}

module.exports = { archiveLogs };
