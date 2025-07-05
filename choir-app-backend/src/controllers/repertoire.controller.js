const db = require("../models");
const { Op, literal } = require("sequelize");
const logger = require("../config/logger");

function parseSearchTokens(search) {
    const regex = /"([^"]+)"|([^"\s]+)/g;
    const tokens = [];
    let match;
    while ((match = regex.exec(search)) !== null) {
        tokens.push(match[1] || match[2]);
    }
    return tokens;
}

/**
 * NEW, INTELLIGENT LOOKUP FUNCTION
 * @description Provides a simple, flat list of all pieces in a choir's repertoire,
 * enriched with a formatted reference string for easy searching on the frontend.
 */
exports.lookup = async (req, res) => {
    try {
        const choir = await db.choir.findByPk(req.activeChoirId);
        if (!choir) {
            return res.status(404).send({ message: "Choir not found." });
        }

        // Holen Sie alle Stücke des Chors mit allen notwendigen Metadaten.
        const pieces = await choir.getPieces({
            joinTableAttributes: [], // Wir brauchen den Status hier nicht.
            include: [
                { model: db.composer, as: 'composer', attributes: ['name'] },
                {
                    model: db.collection,
                    as: 'collections',
                    attributes: ['prefix'],
                    through: {
                        model: db.collection_piece,
                        attributes: ['numberInCollection']
                    }
                }
            ],
            order: [['title', 'ASC']]
        });

        // Verarbeiten Sie die Ergebnisse, um eine saubere, flache Liste zu erstellen.
        const lookupResults = pieces.map(piece => {
            const plainPiece = piece.get({ plain: true });
            let referenceString = null;

            // Erstellen Sie den Referenz-String, falls das Stück in einer Sammlung ist.
            if (plainPiece.collections && plainPiece.collections.length > 0) {
                const ref = plainPiece.collections[0]; // Nehmen Sie die erste Referenz
                const num = ref.collection_piece.numberInCollection;
                referenceString = `${ref.prefix || ''}${num}`;
            }

            // Geben Sie ein sauberes Objekt zurück, das nur das Nötigste enthält.
            return {
                id: plainPiece.id,
                title: plainPiece.title,
                composerName: plainPiece.composer?.name || '',
                reference: referenceString // z.B. "CB45" oder null
            };
        });

        res.status(200).send(lookupResults);

    } catch (err) {
        console.error("ERROR in repertoire lookup:", err);
        res.status(500).send({ message: "An error occurred during repertoire lookup." });
    }
};


exports.findMyRepertoire = async (req, res) => {
    const { composerId, categoryId, categoryIds, collectionId, sortBy, sortDir = 'ASC', status, page = 1, limit = 25, voicing, key, search } = req.query;
    let parsedCategoryIds = [];
    if (categoryIds) {
        parsedCategoryIds = Array.isArray(categoryIds) ? categoryIds : String(categoryIds).split(',');
    } else if (categoryId) {
        parsedCategoryIds = [categoryId];
    }
    parsedCategoryIds = parsedCategoryIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 25;
    const offset = (pageNum - 1) * limitNum;
    try {
        // --- SCHRITT 1: Holen Sie die Basis-Repertoire-Daten des Chors ---
        // Wir holen nur die pieceId und den zugehörigen Status.
        const repertoireLinks = await db.choir_repertoire.findAll({
            where: { choirId: req.activeChoirId, ...(status && { status }) },
            raw: true // Gibt uns einfache Objekte statt Sequelize-Instanzen
        });

        // Wenn der Chor kein Repertoire hat, können wir sofort eine leere Liste zurückgeben.
        if (repertoireLinks.length === 0) {
            return res.status(200).send({ data: [], total: 0 });
        }

        // Erstellen Sie eine Liste aller Stück-IDs im Repertoire und eine Map für den Status.
        const pieceIdsInRepertoire = repertoireLinks.map(link => link.pieceId);
        const statusMap = new Map(repertoireLinks.map(link => [link.pieceId, link.status]));


        // --- SCHRITT 2: Bauen Sie die finale Abfrage auf der Piece-Tabelle ---

        // Beginnen Sie mit der Bedingung, nur Stücke aus dem Repertoire zu holen.
        const whereCondition = {
            id: { [Op.in]: pieceIdsInRepertoire },
            ...(composerId && { composerId }),
            ...(parsedCategoryIds.length && { categoryId: { [Op.in]: parsedCategoryIds } }),
            ...(voicing && { voicing: { [Op.iLike]: `%${voicing}%` } }), // Case-insensitive search
            ...(key && { key }),
        };

        if (search) {
            const tokens = parseSearchTokens(search);
            const refSub = `(
                        SELECT c.prefix || cp."numberInCollection"
                        FROM collection_pieces cp
                        JOIN collections c ON cp."collectionId" = c.id
                        WHERE cp."pieceId" = "piece"."id"
                        ORDER BY cp."numberInCollection"
                        LIMIT 1
                    )`;
            whereCondition[Op.and] = tokens.map(t => ({
                [Op.or]: [
                    { title: { [Op.iLike]: `%${t}%` } },
                    { '$composer.name$': { [Op.iLike]: `%${t}%` } },
                    { '$category.name$': { [Op.iLike]: `%${t}%` } },
                    literal(`${refSub} ILIKE '%${t}%'`)
                ]
            }));
        }

        // Die Include-Anweisungen für alle Metadaten. Die Sammlung wird nur
        // eingebunden, wenn explizit nach einer Collection gefiltert wird.
        const includeClauses = [
            { model: db.composer, as: 'composer' },
            { model: db.category, as: 'category' },
            { model: db.author, as: 'author' },
            // Zusätzliche Daten wie Arranger oder Links werden in dieser Liste
            // nicht benötigt und können ausgelassen werden.
            ...(collectionId ? [{
                model: db.collection,
                as: 'collections',
                attributes: ['id', 'prefix', 'title'],
                through: {
                    model: db.collection_piece,
                    attributes: ['numberInCollection']
                },
                where: { id: collectionId },
                required: true
            }] : [])
        ];

        // Attribute zum Ermitteln der ersten Referenz eines Stücks ohne Join,
        // damit keine Duplikate entstehen.
        const pieceAttributes = {
            include: [
                [
                    literal(`(
                        SELECT c.prefix
                        FROM collection_pieces cp
                        JOIN collections c ON cp."collectionId" = c.id
                        WHERE cp."pieceId" = "piece"."id"
                        ORDER BY cp."numberInCollection"
                        LIMIT 1
                    )`),
                    'collectionPrefix'
                ],
                [
                    literal(`(
                        SELECT cp."numberInCollection"
                        FROM collection_pieces cp
                        JOIN collections c ON cp."collectionId" = c.id
                        WHERE cp."pieceId" = "piece"."id"
                        ORDER BY cp."numberInCollection"
                        LIMIT 1
                    )`),
                    'collectionNumber'
                ],
                [
                    literal(`(
                        SELECT MAX(e.date)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'SERVICE'
                    )`),
                    'lastSung'
                ],
                [
                    literal(`(
                        SELECT MAX(e.date)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'REHEARSAL'
                    )`),
                    'lastRehearsed'
                ],
                [
                    literal(`(
                        SELECT COUNT(*)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'SERVICE'
                    )`),
                    'timesSung'
                ],
                [
                    literal(`(
                        SELECT COUNT(*)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'REHEARSAL'
                    )`),
                    'timesRehearsed'
                ]
            ]
        };

         // --- KORRIGIERTE SORTIERLOGIK ---
        let order;
        const sortDirection = ['ASC', 'DESC'].includes(sortDir.toUpperCase()) ? sortDir.toUpperCase() : 'ASC';

        switch (sortBy) {
            case 'composer':
                // Geben Sie explizit das assoziierte Modell und die Spalte an.
                order = [[{ model: db.composer, as: 'composer' }, 'name', sortDirection]];
                break;
            case 'category':
                order = [[{ model: db.category, as: 'category' }, 'name', sortDirection]];
                break;
            case 'reference':
                const collectionPrefixSubquery = `(
                        SELECT c.prefix
                        FROM collection_pieces cp
                        JOIN collections c ON cp."collectionId" = c.id
                        WHERE cp."pieceId" = "piece"."id"
                        ORDER BY cp."numberInCollection"
                        LIMIT 1
                    )`;
                const collectionNumberSubquery = `(
                        SELECT cp."numberInCollection"
                        FROM collection_pieces cp
                        JOIN collections c ON cp."collectionId" = c.id
                        WHERE cp."pieceId" = "piece"."id"
                        ORDER BY cp."numberInCollection"
                        LIMIT 1
                    )`;
                order = [
                    [literal(collectionPrefixSubquery), sortDirection],
                    [
                        literal(
                            `NULLIF(REGEXP_REPLACE(${collectionNumberSubquery}, '\\D', '', 'g'), '')::INTEGER`
                        ),
                        sortDirection
                    ]
                ];
                break;
            case 'lastSung': {
                const base = `(
                        SELECT MAX(e.date)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'SERVICE'
                    )`;
                const expr = sortDirection === 'DESC'
                    ? `COALESCE(${base}, TO_TIMESTAMP(0))`
                    : base;
                order = [[literal(expr), sortDirection]];
                break;
            }
            case 'lastRehearsed': {
                const base = `(
                        SELECT MAX(e.date)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'REHEARSAL'
                    )`;
                const expr = sortDirection === 'DESC'
                    ? `COALESCE(${base}, TO_TIMESTAMP(0))`
                    : base;
                order = [[literal(expr), sortDirection]];
                break;
            }
            case 'timesSung':
                order = [[literal(`(
                        SELECT COUNT(*)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'SERVICE'
                    )`), sortDirection]];
                break;
            case 'timesRehearsed':
                order = [[literal(`(
                        SELECT COUNT(*)
                        FROM event_pieces ep
                        JOIN events e ON ep."eventId" = e.id
                        WHERE ep."pieceId" = "piece"."id" AND e."choirId" = ${req.activeChoirId} AND e.type = 'REHEARSAL'
                    )`), sortDirection]];
                break;
            case 'title':
            default:
                // Standard-Sortierung nach einer Spalte der Haupttabelle (piece).
                order = [['title', sortDirection]];
                break;
        }

        /*console.log("Repertoire Query:", {
            where: whereCondition,
            include: includeClauses,
            order: order,
            limit: limitNum,
            offset: offset
        });*/

        // Führen Sie die finale Abfrage aus.
        const { rows: pieces, count } = await db.piece.findAndCountAll({
            where: whereCondition,
            include: includeClauses,
            attributes: pieceAttributes,
            order: order,
            limit: limitNum,
            offset: offset,
            distinct: true,
            subQuery: false
        });

        // --- SCHRITT 3: Fügen Sie den Status zu jedem Stück hinzu ---
        // Konvertieren Sie die Sequelize-Instanzen in einfache Objekte für die Bearbeitung.
        const results = pieces.map(piece => {
            const plainPiece = piece.get({ plain: true });
            // Fügen Sie die Status-Information aus unserer Map hinzu.
            plainPiece.choir_repertoire = {
                status: statusMap.get(plainPiece.id) || 'NOT_READY'
            };
            return plainPiece;
        });

        res.status(200).send({ data: results, total: count });

    } catch (err) {
        // Verbessertes Logging für die Fehlersuche
        logger.error(`ERROR finding repertoire for choir ${req.activeChoirId}: ${err.message}`);
        logger.error(err.stack);
        res.status(500).send({
            message: "An error occurred while retrieving the repertoire.",
            details: err.message
        });
    }
};

// Die updateStatus-Methode bleibt unverändert.
exports.updateStatus = async (req, res) => {
    const { pieceId, status } = req.body;
    try {
        await db.choir_repertoire.update(
            { status: status },
            { where: { choirId: req.activeChoirId, pieceId: pieceId } }
        );
        res.status(200).send({ message: "Status updated successfully." });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.findOne = async (req, res) => {
    const id = req.params.id;
    try {
        const piece = await db.piece.findByPk(id, {
            include: [
                { model: db.composer, as: 'composer' },
                { model: db.category, as: 'category' },
                { model: db.author, as: 'author' },
                { model: db.composer, as: 'arrangers' },
                { model: db.piece_link, as: 'links' },
                {
                    model: db.collection,
                    as: 'collections',
                    attributes: ['id', 'prefix', 'title'],
                    through: { model: db.collection_piece, attributes: ['numberInCollection'] }
                },
                {
                    model: db.event,
                    as: 'events',
                    attributes: ['id', 'date', 'type', 'notes'],
                    through: { attributes: [] },
                    where: { choirId: req.activeChoirId },
                    required: false,
                    include: [{ model: db.user, as: 'director', attributes: ['name'] }]
                }
            ],
            order: [[{ model: db.event, as: 'events' }, 'date', 'DESC']]
        });

        if (!piece) {
            return res.status(404).send({ message: 'Piece not found.' });
        }

        const link = await db.choir_repertoire.findOne({
            where: { choirId: req.activeChoirId, pieceId: id }
        });

        const result = piece.get({ plain: true });
        if (link) {
            result.choir_repertoire = { status: link.status };
        }

        res.status(200).send(result);
    } catch (err) {
        console.error('ERROR finding repertoire piece:', err);
        res.status(500).send({ message: err.message || 'Error retrieving piece.' });
    }
};

exports.addPieceToRepertoire = async (req, res) => {
    const { pieceId } = req.body;
    try {
        const choir = await db.choir.findByPk(req.activeChoirId);
        await choir.addPiece(pieceId); // This creates the link in choir_repertoire
        res.status(200).send({ message: "Piece added to repertoire." });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
