const db = require("../models");
const { Op, literal } = require("sequelize");

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
    const { composerId, categoryId, collectionId, sortBy, voicing, key } = req.query;
    try {
        // --- SCHRITT 1: Holen Sie die Basis-Repertoire-Daten des Chors ---
        // Wir holen nur die pieceId und den zugehörigen Status.
        const repertoireLinks = await db.choir_repertoire.findAll({
            where: { choirId: req.activeChoirId },
            raw: true // Gibt uns einfache Objekte statt Sequelize-Instanzen
        });

        // Wenn der Chor kein Repertoire hat, können wir sofort eine leere Liste zurückgeben.
        if (repertoireLinks.length === 0) {
            return res.status(200).send([]);
        }

        // Erstellen Sie eine Liste aller Stück-IDs im Repertoire und eine Map für den Status.
        const pieceIdsInRepertoire = repertoireLinks.map(link => link.pieceId);
        const statusMap = new Map(repertoireLinks.map(link => [link.pieceId, link.status]));


        // --- SCHRITT 2: Bauen Sie die finale Abfrage auf der Piece-Tabelle ---

        // Beginnen Sie mit der Bedingung, nur Stücke aus dem Repertoire zu holen.
        const whereCondition = {
            id: { [Op.in]: pieceIdsInRepertoire },
            ...(composerId && { composerId: composerId }),
            ...(categoryId && { categoryId: categoryId }),
            ...(voicing && { voicing: { [Op.iLike]: `%${voicing}%` } }), // Case-insensitive search
            ...(key && { key: key }),
        };
        // Fügen Sie die optionalen Filter hinzu.
        if (composerId) whereCondition.composerId = composerId;
        if (categoryId) whereCondition.categoryId = categoryId;

        // Die Include-Anweisungen für alle Metadaten.
        const includeClauses = [
            { model: db.composer, as: 'composer' },
            { model: db.category, as: 'category' },
            { model: db.author, as: 'author' },
            { model: db.composer, as: 'arrangers' },
            { model: db.piece_link, as: 'links' },
            {
                model: db.collection,
                as: 'collections',
                attributes: ['id', 'prefix', 'title'],
                through: {
                    model: db.collection_piece,
                    attributes: ['numberInCollection']
                },
                // Wenn nach einer Sammlung gefiltert wird, wird dies zur Bedingung.
                ...(collectionId && { where: { id: collectionId }, required: true })
            }
        ];

        // Die Sortierlogik bleibt gleich.
        let order = [['title', 'ASC']];
        if (sortBy === 'reference') {
            order = [
                // Wir müssen den Join-Alias explizit angeben, damit Sequelize weiß, wo es suchen soll.
                [literal('"collections.prefix"'), 'ASC'],
                [literal('CAST("collections->collection_piece"."numberInCollection" AS INTEGER)'), 'ASC']
            ];
        }

        // Führen Sie die finale Abfrage aus.
        let pieces = await db.piece.findAll({
            where: whereCondition,
            include: includeClauses,
            order: order
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

        res.status(200).send(results);

    } catch (err) {
        // Loggen Sie den Fehler im Backend für einfaches Debugging.
        console.error("ERROR finding repertoire:", err);
        res.status(500).send({ message: "An error occurred while retrieving the repertoire." });
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
