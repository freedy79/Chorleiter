const { parse } = require('csv-parse');
const db = require("../models");
const crypto = require('crypto');
const jobs = require('../services/import-jobs.service');
const { isoDateString } = require('../utils/date.utils');
const { formatPersonName } = require('../utils/name.utils');

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
        instance = await model.findOne({
            where: db.Sequelize.where(
                db.Sequelize.fn('lower', db.Sequelize.col('name')),
                where.name.toLowerCase()
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

// Diese Funktion führt den eigentlichen Import aus, ohne auf den Request zu warten.
const processImport = async (job, collection, records) => {
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
            let composerName = formatPersonName(record.composer);
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

            const composer = await findOrCreatePerson(
                db.composer,
                composerName,
                job.id,
                'Composer'
            );
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

            const [piece, created] = await db.piece.findOrCreate({
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
        trim: true
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
        return res.status(200).send(records.slice(0, 2));
    }

    // --- Finaler Import-Modus (asynchron) ---
    const jobId = crypto.randomUUID();
    const job = jobs.createJob(jobId);
    job.status = 'running';

    // Starten Sie den Import im Hintergrund und senden Sie sofort die Job-ID zurück.
    // Nicht `await` verwenden!
    processImport(job, collection, records).catch(err => {
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
    const parser = parse(fileContent, { delimiter: ';', columns: header => header.map(h => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });

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
    processImport
};
