const authRoutes = require('./auth.routes');
const pieceRoutes = require('./piece.routes');
const eventRoutes = require('./event.routes');
const userRoutes = require('./user.routes');
const composerRoutes = require('./composer.routes');
const categoryRoutes = require('./category.routes');
const repertoireRoutes = require('./repertoire.routes');
const collectionRoutes = require('./collection.routes');
const importRoutes = require('./import.routes');
const authorRoutes = require('./author.routes');
const publisherRoutes = require('./publisher.routes');
const pieceChangeRoutes = require('./piece-change.routes');
const adminRoutes = require('./admin.routes');
const backupRoutes = require('./backup.routes');
const choirManagementRoutes = require('./choir-management.routes');
const invitationRoutes = require('./invitation.routes');
const joinRoutes = require('./join.routes');
const statsRoutes = require('./stats.routes');
const searchHistoryRoutes = require('./search-history.routes');
const searchRoutes = require('./search.routes');
const passwordResetRoutes = require('./password-reset.routes');
const emailChangeRoutes = require('./email-change.routes');
const repertoireFilterRoutes = require('./repertoire-filter.routes');
const practiceListRoutes = require('./practice-list.routes');
const monthlyPlanRoutes = require('./monthlyPlan.routes');
const planRuleRoutes = require('./planRule.routes');
const planEntryRoutes = require('./planEntry.routes');
const availabilityRoutes = require('./availability.routes');
const clientErrorRoutes = require('./client-error.routes');
const postRoutes = require('./post.routes');
const chatRoutes = require('./chat.routes');
const notificationRoutes = require('./notification.routes');
const libraryRoutes = require('./library.routes');
const programRoutes = require('./program.routes');
const districtRoutes = require('./district.routes');
const congregationRoutes = require('./congregation.routes');
const paypalRoutes = require('./paypal.routes');
const imprintRoutes = require('./imprint.routes');
const enrichmentRoutes = require('./enrichment.routes');
const doubletteRoutes = require('./doublette.routes');
const publicRoutes = require('./public.routes');
const pageViewRoutes = require('./page-view.routes');
const formRoutes = require('./form.routes');

const routeDefinitions = [
    ['/api/auth', authRoutes],
    ['/api/pieces', pieceRoutes],
    ['/api/events', eventRoutes],
    ['/api/users', userRoutes],
    ['/api/composers', composerRoutes],
    ['/api/categories', categoryRoutes],
    ['/api/repertoire', repertoireRoutes],
    ['/api/collections', collectionRoutes],
    ['/api/import', importRoutes],
    ['/api/authors', authorRoutes],
    ['/api/publishers', publisherRoutes],
    ['/api/piece-changes', pieceChangeRoutes],
    ['/api/admin', adminRoutes],
    ['/api/backup', backupRoutes],
    ['/api/choir-management', choirManagementRoutes],
    ['/api/invitations', invitationRoutes],
    ['/api/join', joinRoutes],
    ['/api/stats', statsRoutes],
    ['/api/search-history', searchHistoryRoutes],
    ['/api/search', searchRoutes],
    ['/api/password-reset', passwordResetRoutes],
    ['/api/email-change', emailChangeRoutes],
    ['/api/repertoire-filters', repertoireFilterRoutes],
    ['/api/practice-lists', practiceListRoutes],
    ['/api/monthly-plans', monthlyPlanRoutes],
    ['/api/plan-rules', planRuleRoutes],
    ['/api/plan-entries', planEntryRoutes],
    ['/api/availabilities', availabilityRoutes],
    ['/api/client-errors', clientErrorRoutes],
    ['/api/posts', postRoutes],
    ['/api/chat', chatRoutes],
    ['/api/notifications', notificationRoutes],
    ['/api/library', libraryRoutes],
    ['/api/programs', programRoutes],
    ['/api/districts', districtRoutes],
    ['/api/congregations', congregationRoutes],
    ['/api/paypal', paypalRoutes],
    ['/api/imprint', imprintRoutes],
    ['/api/admin/enrichment', enrichmentRoutes],
    ['/api/public', publicRoutes],
    ['/api/page-views', pageViewRoutes],
    ['/api/forms', formRoutes],
];

function registerRoutes(app) {
    routeDefinitions.forEach(([path, router]) => {
        app.use(path, router);
    });

    // Special mount that directly binds endpoints to app
    doubletteRoutes(app);
}

module.exports = {
    registerRoutes,
    routeDefinitions,
};
