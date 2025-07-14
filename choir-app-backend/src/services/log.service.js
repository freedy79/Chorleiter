const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const LOG_DIR = path.join(__dirname, '..', '..', 'logs');

const logLineRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) \[([^\]]+)\]: (.*)$/;

function parseStandardLog(content) {
    const lines = content.split(/\r?\n/);
    const entries = [];
    let current = null;
    for (const line of lines) {
        if (!line) continue;
        const match = line.match(logLineRegex);
        if (match) {
            current = { timestamp: match[1], level: match[2], message: match[3] };
            entries.push(current);
        } else if (current) {
            current.message += '\n' + line;
        }
    }
    return entries;
}

function parseJsonLog(content) {
    const lines = content.split(/\r?\n/).filter(Boolean);
    return lines.map(l => {
        try {
            return JSON.parse(l);
        } catch (err) {
            return { raw: l };
        }
    });
}

async function listLogFiles() {
    try {
        const files = await fs.promises.readdir(LOG_DIR);
        return files.filter(f => f.endsWith('.log'));
    } catch {
        return [];
    }
}

async function readLogFile(filename) {
    const safe = path.basename(filename);
    const filePath = path.join(LOG_DIR, safe);
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        if (safe === 'exceptions.log' || safe === 'rejections.log') {
            return parseJsonLog(data);
        }
        return parseStandardLog(data);
    } catch (err) {
        if (err.code === 'ENOENT') return null;
        throw err;
    }
}

async function deleteLogFile(filename) {
    const safe = path.basename(filename);
    const filePath = path.join(LOG_DIR, safe);
    try {
        await fs.promises.unlink(filePath);
        logger.reset();
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') return false;
        if (err.code === 'EPERM') {
            // On Windows the file might still be locked by the logger
            await fs.promises.truncate(filePath, 0);
            logger.reset();
            return true;
        }
        throw err;
    }
}

module.exports = { listLogFiles, readLogFile, deleteLogFile };
