const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/public-page.controller');
const { createUserWithRoles } = require('./utils/userFactory');

function createRes() {
    return {
        statusCode: 200,
        data: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        send(payload) {
            this.data = payload;
            return this;
        },
    };
}

(async () => {
    try {
        await db.sequelize.sync({ force: true });

        const choirA = await db.choir.create({ name: 'Choir A' });
        const choirB = await db.choir.create({ name: 'Choir B' });
        const adminA = await createUserWithRoles(db, {
            email: 'adminA@example.com',
            choirMemberships: [{ choirId: choirA.id, rolesInChoir: ['choir_admin'] }],
        });

        const res = createRes();

        await controller.updateMyPublicPage({
            activeChoirId: choirA.id,
            userId: adminA.id,
            body: {
                slug: 'Choir-A',
                isEnabled: true,
                isPublished: true,
                templateKey: 'classic',
                headline: 'Willkommen',
                contentBlocks: [{ id: 'intro', type: 'text', text: 'Hallo Welt' }],
            },
        }, res);

        assert.strictEqual(res.statusCode, 200, 'public page should be created/updated');

        const resSlug = createRes();
        await controller.checkSlugAvailability({
            activeChoirId: choirB.id,
            query: { slug: 'choir-a' },
        }, resSlug);

        assert.strictEqual(resSlug.statusCode, 200, 'slug availability should respond 200');
        assert.strictEqual(resSlug.data.available, false, 'slug should not be available for another choir');

        const publicRes = createRes();
        await controller.getPublicPageBySlug({ params: { slug: 'choir-a' } }, publicRes);
        assert.strictEqual(publicRes.statusCode, 200, 'published page should be publicly accessible');
        assert.strictEqual(publicRes.data.page.slug, 'choir-a', 'slug should be normalized to lowercase');

        const notPublishedRes = createRes();
        await controller.getPublicPageBySlug({ params: { slug: 'choir-b' } }, notPublishedRes);
        assert.strictEqual(notPublishedRes.statusCode, 404, 'missing page should return 404');

        await db.sequelize.close();
    } catch (err) {
        console.error(err);
        await db.sequelize.close();
        process.exit(1);
    }
})();
