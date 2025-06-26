const { parse } = require('csv-parse');
const db = require("../models");
const crypto = require('crypto');
const jobs = require('../services/import-jobs.service');

const findOrCreate = async (model, where, defaults, jobId, entityName) => {
    const [instance, created] = await model.findOrCreate({ where, defaults });
    if (created) {
        jobs.updateJobLog(jobId, `${entityName} "${instance.name}" created.`);
    }
    return instance;
};

// Diese Funktion führt den eigentlichen Import aus, ohne auf den Request zu warten.
const processImport = async (job, collection, records) => {
    jobs.updateJobProgress(job.id, 0, records.length);
    let addedCount = 0;
    let errors = [];

    for (const [index, record] of records.entries()) {
        try {
            const number = record.nummer || record.number;
            const title = record.titel || record.title;
            const composerName = record.komponist || record.composer;
            const categoryName = record.kategorie || record.rubrik || record.category;

            if (!number || !title || !composerName) {
                throw new Error(`Skipping row due to missing data: ${JSON.stringify(record)}`);
            }
            
            jobs.updateJobLog(job.id, `Processing row ${index + 1}: "${title}"...`);

            const composer = await findOrCreate(db.composer, { name: composerName }, { name: composerName }, job.id, 'Composer');
            let category = null;
            if (categoryName) {
                category = await findOrCreate(db.category, { name: categoryName }, { name: categoryName }, job.id, 'Category');
            }

            const [piece, created] = await db.piece.findOrCreate({
                where: { title: title, composerId: composer.id },
                defaults: {
                    title: title,
                    composerId: composer.id,
                    categoryId: category ? category.id : null,
                    voicing: record.voicing || 'SATB'
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
    const parser = parse(fileContent, { delimiter: ';', columns: header => header.map(h => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });

    const records = [];
    try {
        for await (const record of parser) { records.push(record); }
    } catch (e) { return res.status(400).send({ message: 'Could not parse CSV file.' }); }

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