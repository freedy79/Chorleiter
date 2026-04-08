const doubletteController = require('../controllers/doublette.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

module.exports = function(app) {
    // All doublette endpoints require admin role
    const authMiddleware = [verifyToken, role.requireAdmin];

    // Check doublettes in entire choir repertoire
    app.post(
        '/api/choirs/:choirId/pieces/check-doublettes',
        authMiddleware,
        doubletteController.checkDoublettesForChoir
    );

    // Check doublettes within specific collection
    app.get(
        '/api/choirs/:choirId/collections/:collectionId/check-doublettes',
        authMiddleware,
        doubletteController.checkDoublettesForCollection
    );

    // Get collections containing a piece
    app.get(
        '/api/choirs/:choirId/pieces/:pieceId/collections',
        authMiddleware,
        doubletteController.getPieceCollections
    );

    // Merge two pieces
    app.post(
        '/api/choirs/:choirId/pieces/merge',
        authMiddleware,
        doubletteController.mergePieces
    );

    // Get similarity threshold
    app.get(
        '/api/system/doublette-threshold',
        authMiddleware,
        doubletteController.getThreshold
    );

    // Set similarity threshold
    app.put(
        '/api/system/doublette-threshold',
        authMiddleware,
        doubletteController.setThreshold
    );
};
