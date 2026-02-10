const { parse } = require('csv-parse');
const db = require("../models");
const crypto = require('crypto');
const jobs = require('../services/import-jobs.service');
const { isoDateString } = require('../utils/date.utils');
const { formatPersonName, normalize, levenshtein } = require('../utils/name.utils');
const logger = require('../config/logger');

// Sanitize CSV cell values to prevent formula injection
function sanitizeCsvCell(value) {
    if (typeof value !== 'string') return value;

    // Remove leading characters that could start formulas in spreadsheet applications
    const dangerousStart = /^[=+\-@\t\r]/;
    if (dangerousStart.test(value)) {
        logger.warn(`Sanitized potentially dangerous CSV value: ${value.substring(0, 20)}`);
        return "'" + value; // Prefix with single quote to force text interpretation
    }

    return value;
}

// Safe JSON parse with prototype pollution protection
function safeJsonParse(jsonString, errorMessage = 'Invalid JSON') {
    try {
        const DANGEROUS_PROPS = ['__proto__', 'constructor', 'prototype'];
        return JSON.parse(jsonString, (key, value) => {
            if (DANGEROUS_PROPS.includes(key)) {
                logger.warn(`Blocked dangerous property "${key}" during JSON parsing`);
                return undefined;
            }
            return value;
        });
    } catch (err) {
        throw new Error(errorMessage);
    }
}

// Mapping for CSV header names to canonical field keys
const FIELD_MAPPINGS = {
    nummer: 'number',
    nr: 'number',
    number: 'number',
    titel: 'title',
    title: 'title',
    name: 'title',
    komponist: 'composer',
    composer: 'composer',
    dichter: 'author',
    author: 'author',
    kategorie: 'category',
    rubrik: 'category',
    category: 'category',
    besetzung: 'voicing',
    voicing: 'voicing',
    textquelle: 'lyricsSource',
    tonart: 'key',
    key: 'key'
};

const findOrCreate = async (model, where, defaults, jobId, entityName, options = {}) => {
    const { ignoreCase = false } = options;
    let instance;
    let created = false;

    if (ignoreCase && where.name) {
        // Sanitize input to prevent potential SQL injection
        const sanitizedName = where.name.toString().toLowerCase().replace(/[^\w\s\-,.äöüß]/g, '');
        instance = await model.findOne({
            where: db.Sequelize.where(
                db.Sequelize.fn('lower', db.Sequelize.col('name')),
                sanitizedName
            )
        });
        if (!instance) {
            instance = await model.create(defaults);
            created = true;
        }
    } else {
        [instance, created] = await model.findOrCreate({ where, defaults });
    }

    if (created) {
        jobs.updateJobLog(jobId, `${entityName} "${instance.name}" created.`);
    }
    return instance;
};

const findExistingByAbbreviation = async (model, name) => {
    if (!name || !name.includes(',')) return null;
    const [last, first] = name.split(',').map(s => s.trim());
    if (!first) return null;
    const parts = first.split(/\s+/);
    if (!parts.some(p => p.includes('.'))) return null;
    const initials = parts.map(p => p[0] ? p[0].toLowerCase() : '').join('');
    const { Op } = db.Sequelize;
    const candidates = await model.findAll({
        where: db.Sequelize.where(
            db.Sequelize.fn('lower', db.Sequelize.col('name')),
            { [Op.like]: `${last.toLowerCase()},%` }
        )
    });
    for (const cand of candidates) {
        const candFirst = cand.name.split(',')[1]?.trim() || '';
        const candInitials = candFirst.split(/\s+/).map(p => p[0] ? p[0].toLowerCase() : '').join('');
        if (candInitials === initials) {
            return cand;
        }
    }
    return null;
};

const findOrCreatePerson = async (model, name, jobId, entityName) => {
    const existing = await findExistingByAbbreviation(model, name);
    if (existing) return existing;
    return await findOrCreate(
        model,
        { name },
        { name },
        jobId,
        entityName,
        { ignoreCase: true }
    );
};

const tokenize = (str) => {
    return str.toLowerCase().split(/[\s,]+/).filter(token => token.length > 0);
};

const similarityScore = (a, b) => {
    const na = normalize(a || '');
    const nb = normalize(b || '');
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.95;

    // Token-based matching for better partial matches
    const tokensA = tokenize(a);
    const tokensB = tokenize(b);

    // Check if all tokens from input match tokens in candidate
    if (tokensA.length > 0 && tokensB.length > 0) {
        const matchedTokens = tokensA.filter(tokenA =>
            tokensB.some(tokenB => {
                const normA = normalize(tokenA);
                const normB = normalize(tokenB);
                // Exact match or starts with
                if (normB.startsWith(normA) || normA.startsWith(normB)) return true;
                // Fuzzy match for longer tokens
                if (normA.length >= 3 && normB.length >= 3) {
                    const dist = levenshtein(normA, normB);
                    const maxLen = Math.max(normA.length, normB.length);
                    return (1 - dist / maxLen) >= 0.8;
                }
                return false;
            })
        );

        if (matchedTokens.length === tokensA.length) {
            // All input tokens matched - very good match
            return 0.9;
        } else if (matchedTokens.length > 0) {
            // Partial token match
            return 0.7 + (matchedTokens.length / tokensA.length) * 0.15;
        }
    }

    // Fallback to Levenshtein distance
    const distance = levenshtein(na, nb);
    const maxLen = Math.max(na.length, nb.length);
    return maxLen === 0 ? 0 : 1 - distance / maxLen;
};

const rankCandidates = (input, candidates, nameAccessor, options = {}) => {
    const { minScore = 0.6, maxResults = 10 } = options;
    return candidates
        .map(candidate => {
            const name = nameAccessor(candidate);
            return {
                candidate,
                score: similarityScore(input, name)
            };
        })
        .filter(option => option.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
};

const pickBestMatch = (options) => {
    if (!options.length) return null;
    if (options.length === 1 && options[0].score >= 0.6) return options[0].candidate;
    const top = options[0];
    const second = options[1];
    if (top.score >= 0.9 && (!second || (top.score - second.score) >= 0.1)) {
        return top.candidate;
    }
    return null;
};

const findComposerMatch = async (name) => {
    if (!name) return { match: null, options: [], ambiguous: false };
    const trimmed = name.trim();
    const { Op, fn, col, where } = db.Sequelize;

    // Check for exact match
    const exact = await db.composer.findOne({
        where: where(fn('lower', col('name')), trimmed.toLowerCase())
    });
    if (exact) {
        // Even with exact match, return it as an option so user can confirm or choose differently
        return {
            match: exact,
            options: [{ id: exact.id, name: exact.name, score: 1.0 }],
            ambiguous: false
        };
    }

    // Check for abbreviation match
    const abbr = await findExistingByAbbreviation(db.composer, trimmed);
    if (abbr) {
        return {
            match: abbr,
            options: [{ id: abbr.id, name: abbr.name, score: 0.95 }],
            ambiguous: false
        };
    }

    // Get last name for broader search
    const lastName = trimmed.includes(',')
        ? trimmed.split(',')[0].trim()
        : trimmed.split(/\s+/).slice(-1)[0];

    if (!lastName) return { match: null, options: [], ambiguous: false };

    // Find candidates by last name or full fuzzy search
    const candidatesByLastName = await db.composer.findAll({
        where: where(fn('lower', col('name')), { [Op.like]: `${lastName.toLowerCase()}%` })
    });

    // Also search all composers for better fuzzy matching
    const allComposers = await db.composer.findAll({ limit: 200 });

    // Combine and deduplicate candidates
    const allCandidates = [...new Map(
        [...candidatesByLastName, ...allComposers].map(c => [c.id, c])
    ).values()];

    const options = rankCandidates(trimmed, allCandidates, cand => cand.name, { minScore: 0.6, maxResults: 10 });
    const match = pickBestMatch(options);
    const ambiguous = !match && options.length > 1;

    return {
        match,
        options: options.map(option => ({
            id: option.candidate.id,
            name: option.candidate.name,
            score: option.score
        })),
        ambiguous
    };
};

const findPieceMatch = async (title, composerId) => {
    if (!title) return { match: null, options: [], ambiguous: false };
    const trimmed = title.trim();
    const { Op, fn, col, where } = db.Sequelize;

    // Tokenize the title for better matching
    const tokens = tokenize(trimmed);
    const firstToken = tokens[0] || trimmed;
    const token = firstToken.slice(0, 6);
    const likeToken = token ? `%${token.toLowerCase()}%` : `%${trimmed.toLowerCase()}%`;

    // Build where clause based on whether we have a composerId
    const whereClause = composerId ? { composerId } : {};

    // Find candidates by title token
    const candidatesByToken = await db.piece.findAll({
        where: {
            ...whereClause,
            [Op.and]: [where(fn('lower', col('title')), { [Op.like]: likeToken })]
        },
        include: [{ model: db.composer, as: 'composer', attributes: ['id', 'name'] }],
        limit: 50
    });

    // Also get pieces from the same composer for better matching
    let allCandidates = candidatesByToken;
    if (composerId) {
        const composerPieces = await db.piece.findAll({
            where: { composerId },
            include: [{ model: db.composer, as: 'composer', attributes: ['id', 'name'] }],
            limit: 100
        });
        // Combine and deduplicate
        allCandidates = [...new Map(
            [...candidatesByToken, ...composerPieces].map(p => [p.id, p])
        ).values()];
    }

    const options = rankCandidates(trimmed, allCandidates, cand => cand.title, { minScore: 0.6, maxResults: 10 });
    const match = pickBestMatch(options);
    const ambiguous = !match && options.length > 1;

    return {
        match,
        options: options.map(option => ({
            id: option.candidate.id,
            title: option.candidate.title,
            composerName: option.candidate.composer?.name || null,
            score: option.score
        })),
        ambiguous
    };
};

// Diese Funktion führt den eigentlichen Import aus, ohne auf den Request zu warten.
const processImport = async (job, collection, records, resolutions = {}) => {
    jobs.updateJobProgress(job.id, 0, records.length);
    let addedCount = 0;
    let errors = [];

    const existingLinks = await collection.getPieces({ through: { attributes: ['numberInCollection'] } });
    let maxNumber = existingLinks.reduce((max, piece) => {
        const num = parseInt(piece.collection_piece.numberInCollection, 10);
        return !isNaN(num) && num > max ? num : max;
        }, 0);
    let nextNumber = maxNumber + 1;

    for (const [index, record] of records.entries()) {
        try {
            let number = record.number && record.number.toString().trim();
            const title = record.title;
            let composerName = record.composer ? record.composer.toString().trim() : null;
            const categoryName = record.category;
            let authorName = record.author ? formatPersonName(record.author) : null;

            if (!title || !composerName) {
                throw new Error(`Skipping row due to missing data: ${JSON.stringify(record)}`);
            }

            if (!number) {
                number = nextNumber.toString();
                nextNumber++;
                jobs.updateJobLog(job.id, `No number provided. Using ${number}.`);
            }

            jobs.updateJobLog(job.id, `Processing row ${index + 1}: "${title}"...`);

            const resolution = resolutions[index] || resolutions[index.toString()] || {};
            let composer = null;

            if (resolution.createNewComposer) {
                // User explicitly wants to create a new composer
                const formattedName = formatPersonName(composerName);
                composer = await findOrCreatePerson(
                    db.composer,
                    formattedName,
                    job.id,
                    'Composer'
                );
                jobs.updateJobLog(job.id, `Composer created by user request: ${composer.name}.`);
            } else if (resolution.composerId) {
                composer = await db.composer.findByPk(resolution.composerId);
                if (!composer) {
                    throw new Error(`Selected composer ${resolution.composerId} not found.`);
                }
                jobs.updateJobLog(job.id, `Composer resolved by user: ${composer.name}.`);
            } else {
                const composerMatch = await findComposerMatch(composerName);
                if (composerMatch.ambiguous) {
                    const optionsText = composerMatch.options.map(opt => opt.name).join(', ');
                    throw new Error(`Ambiguous composer "${composerName}". Options: ${optionsText}`);
                }
                if (composerMatch.match) {
                    composer = composerMatch.match;
                    jobs.updateJobLog(job.id, `Composer matched: ${composer.name}.`);
                } else {
                    const formattedName = formatPersonName(composerName);
                    composer = await findOrCreatePerson(
                        db.composer,
                        formattedName,
                        job.id,
                        'Composer'
                    );
                }
            }
            let category = null;
            if (categoryName) {
                category = await findOrCreate(
                    db.category,
                    { name: categoryName },
                    { name: categoryName },
                    job.id,
                    'Category',
                    { ignoreCase: true }
                );
            }
            let author = null;
            if (authorName) {
                author = await findOrCreatePerson(
                    db.author,
                    authorName,
                    job.id,
                    'Author'
                );
            }

            let piece = null;
            let created = false;
            if (resolution.pieceId) {
                piece = await db.piece.findByPk(resolution.pieceId);
                if (!piece) {
                    throw new Error(`Selected piece ${resolution.pieceId} not found.`);
                }
                jobs.updateJobLog(job.id, `Piece resolved by user: "${piece.title}".`);
            } else if (resolution.createNewPiece === true) {
                [piece, created] = await db.piece.findOrCreate({
                    where: { title: title, composerId: composer.id },
                    defaults: {
                        title: title,
                        composerId: composer.id,
                        categoryId: category ? category.id : null,
                        authorId: author ? author.id : null,
                        voicing: record.voicing || 'SATB',
                        key: record.key || null,
                        lyricsSource: record.lyricsSource || null
                    }
                });
            } else {
                const pieceMatch = await findPieceMatch(title, composer?.id);
                if (pieceMatch.ambiguous) {
                    const optionsText = pieceMatch.options.map(opt => `${opt.title}${opt.composerName ? ` (${opt.composerName})` : ''}`).join(', ');
                    throw new Error(`Ambiguous title "${title}". Options: ${optionsText}`);
                }
                if (pieceMatch.match) {
                    piece = pieceMatch.match;
                    jobs.updateJobLog(job.id, `Piece matched: "${piece.title}".`);
                } else {
                    [piece, created] = await db.piece.findOrCreate({
                        where: { title: title, composerId: composer.id },
                        defaults: {
                            title: title,
                            composerId: composer.id,
                            categoryId: category ? category.id : null,
                            authorId: author ? author.id : null,
                            voicing: record.voicing || 'SATB',
                            key: record.key || null,
                            lyricsSource: record.lyricsSource || null
                        }
                    });
                }
            }

            if (created) {
                jobs.updateJobLog(job.id, `Piece "${piece.title}" created.`);
            } else {
                jobs.updateJobLog(job.id, `Piece "${piece.title}" already exists.`);
            }

            await collection.addPiece(piece, { through: { numberInCollection: number.toString() } });
            jobs.updateJobLog(job.id, `-> Linked to collection with number ${number}.`);

            addedCount++;
        } catch (rowError) {
            const errorMessage = `Error on row ${index + 1}: ${rowError.message}`;
            errors.push(errorMessage);
            jobs.updateJobLog(job.id, errorMessage);
        }
        jobs.updateJobProgress(job.id, index + 1, records.length);
    }

    const result = {
        message: `Import complete. ${addedCount} pieces processed.`,
        addedCount,
        errors
    };
    jobs.completeJob(job.id, result);
};


exports.startImportCsvToCollection = async (req, res) => {
    const collectionId = req.params.id;
    if (!req.file) return res.status(400).send({ message: 'No CSV file uploaded.' });

    const collection = await db.collection.findByPk(collectionId);
    if (!collection) return res.status(404).send({ message: 'Collection not found.' });

    const fileContent = req.file.buffer.toString('utf-8');
    const parser = parse(fileContent, {
        delimiter: ';',
        columns: header => header.map(h => {
            const key = h.trim().toLowerCase();
            return FIELD_MAPPINGS[key] || key;
        }),
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
            // Sanitize all cell values to prevent CSV formula injection
            return sanitizeCsvCell(value);
        }
    });

    const records = [];
    try {
        for await (const record of parser) { records.push(record); }
    } catch (e) {
        return res.status(400).send({
            message: 'Could not parse CSV file.',
            detail: e.message,
            hint: "Check that the file uses ';' as separator and contains headers: nummer; titel; komponist; kategorie."
        });
    }

    // Vorschau-Modus bleibt synchron
    if (req.query.mode === 'preview') {
        const previewRecords = await Promise.all(records.map(async (record, index) => {
            const composerName = record.composer ? record.composer.toString().trim() : null;
            const composerMatch = composerName ? await findComposerMatch(composerName) : { match: null, options: [], ambiguous: false };
            const composerId = composerMatch.match ? composerMatch.match.id : null;
            const pieceMatch = record.title ? await findPieceMatch(record.title.toString(), composerId) : { match: null, options: [], ambiguous: false };

            return {
                rowIndex: index,
                ...record,
                composerMatch: composerMatch.match ? { id: composerMatch.match.id, name: composerMatch.match.name } : null,
                composerOptions: composerMatch.options,
                titleMatch: pieceMatch.match ? { id: pieceMatch.match.id, title: pieceMatch.match.title, composerName: pieceMatch.match.composer?.name || null } : null,
                titleOptions: pieceMatch.options,
                needsDecision: composerMatch.ambiguous || pieceMatch.ambiguous
            };
        }));
        return res.status(200).send(previewRecords);
    }

    // --- Finaler Import-Modus (asynchron) ---
    let resolutions = {};
    if (req.body?.resolutions) {
        try {
            resolutions = safeJsonParse(req.body.resolutions, 'Invalid resolutions payload.');
        } catch (err) {
            return res.status(400).send({ message: err.message });
        }
    }

    const jobId = crypto.randomUUID();
    const job = jobs.createJob(jobId);
    job.status = 'running';

    // Starten Sie den Import im Hintergrund und senden Sie sofort die Job-ID zurück.
    // Nicht `await` verwenden!

    processImport(job, collection, records, resolutions).catch(err => {
        jobs.failJob(jobId, err.message);
    });

    res.status(202).send({ jobId: jobId }); // 202 Accepted
};

// Neuer Endpunkt zum Abfragen des Job-Status
exports.getImportStatus = (req, res) => {
    const job = jobs.getJob(req.params.jobId);
    if (!job) {
        return res.status(404).send({ message: 'Job not found.' });
    }
    res.status(200).send(job);
};

// ------------------ EVENT CSV IMPORT ------------------

const findPieceByReference = async (reference) => {
    if (!reference) return null;
    const match = reference.match(/^(\D+)(\d+)$/);
    if (!match) return null;

    const prefix = match[1];
    const num = match[2];
    return await db.piece.findOne({
        include: [{
            model: db.collection,
            as: 'collections',
            where: { prefix },
            through: { where: { numberInCollection: num } }
        }]
    });
};

const parseGermanDate = (str) => {
    const match = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (match) {
        const [, d, m, y] = match;
        return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(str);
};

const processEventImport = async (job, eventType, records, choirId, userId) => {
    jobs.updateJobProgress(job.id, 0, records.length);
    let processed = 0;
    const { Op, fn, col, where } = require('sequelize');

    for (const [index, record] of records.entries()) {
        try {
            const reference = record.referenz || record.reference;
            const dateStr = record.datum || record.date;

            if (!reference || !dateStr) {
                throw new Error(`Missing data in row ${index + 1}`);
            }

            const piece = await findPieceByReference(reference);
            if (!piece) {
                throw new Error(`Piece not found for reference "${reference}"`);
            }

            const targetDate = parseGermanDate(dateStr);
            const dateOnly = isoDateString(targetDate);

            let event = await db.event.findOne({
                where: {
                    choirId,
                    type: eventType,
                    [Op.and]: [where(fn('date', col('date')), dateOnly)]
                }
            });

            if (!event) {
                event = await db.event.create({
                    date: targetDate,
                    type: eventType,
                    choirId,
                    directorId: userId
                });
                jobs.updateJobLog(job.id, `Event on ${dateStr} created.`);
            }

            const [link, created] = await db.event_pieces.findOrCreate({
                where: { eventId: event.id, pieceId: piece.id }
            });
            if (created) {
                jobs.updateJobLog(job.id, `Piece "${piece.title}" added to event ${dateStr}.`);
            } else {
                jobs.updateJobLog(job.id, `Piece "${piece.title}" already in event ${dateStr}.`);
            }

            // Update repertoire status according to event type
            if (eventType === 'REHEARSAL') {
                await db.choir_repertoire.update(
                    { status: 'IN_REHEARSAL' },
                    {
                        where: {
                            choirId,
                            pieceId: piece.id,
                            status: 'NOT_READY'
                        }
                    }
                );
            } else if (eventType === 'SERVICE') {
                await db.choir_repertoire.update(
                    { status: 'CAN_BE_SUNG' },
                    {
                        where: {
                            choirId,
                            pieceId: piece.id,
                            status: { [Op.in]: ['NOT_READY', 'IN_REHEARSAL'] }
                        }
                    }
                );
            }

            processed++;
        } catch (err) {
            jobs.updateJobLog(job.id, `Error on row ${index + 1}: ${err.message}`);
        }
        jobs.updateJobProgress(job.id, index + 1, records.length);
    }

    const result = { message: `Import complete. ${processed} rows processed.` };
    jobs.completeJob(job.id, result);
};

exports.startImportEvents = async (req, res) => {
    const eventType = (req.query.type || '').toUpperCase();
    if (!['REHEARSAL', 'SERVICE'].includes(eventType)) {
        return res.status(400).send({ message: 'Invalid event type.' });
    }
    if (!req.file) return res.status(400).send({ message: 'No CSV file uploaded.' });

    const fileContent = req.file.buffer.toString('utf-8');
    const parser = parse(fileContent, {
        delimiter: ';',
        columns: header => header.map(h => h.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
            // Sanitize all cell values to prevent CSV formula injection
            return sanitizeCsvCell(value);
        }
    });

    const records = [];
    try {
        for await (const record of parser) { records.push(record); }
    } catch (e) {
        return res.status(400).send({ message: 'Could not parse CSV file.' });
    }

    if (req.query.mode === 'preview') {
        return res.status(200).send(records.slice(0, 2));
    }

    const jobId = crypto.randomUUID();
    const job = jobs.createJob(jobId);
    job.status = 'running';

    processEventImport(job, eventType, records, req.activeChoirId, req.userId).catch(err => {
        jobs.failJob(jobId, err.message);
    });

    res.status(202).send({ jobId });
};

// Expose internal helpers for testing
exports._test = {
    processEventImport,
    processImport,
    findComposerMatch,
    findPieceMatch,
    similarityScore,
    rankCandidates,
    tokenize
};
