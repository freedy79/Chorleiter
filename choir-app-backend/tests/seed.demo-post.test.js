const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const { seedDatabase } = require('../src/seed');

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    await seedDatabase({ includeDemoData: true });

    const demoChoir = await db.choir.findOne({ where: { name: 'Demo-Chor' } });
    assert.ok(demoChoir, 'Demo-Chor should be seeded');

    const demoPost = await db.post.findOne({
      where: {
        choirId: demoChoir.id,
        title: 'Willkommen im Demo-Chor'
      }
    });
    assert.ok(demoPost, 'Demo post should be seeded for Demo-Chor');
    assert.strictEqual(demoPost.published, true, 'Demo post should be published');
    assert.ok(
      (demoPost.text || '').includes('Willkommen bei NAK Chorleiter'),
      'Demo post should contain the enhanced demo text'
    );

    const poll = await db.poll.findOne({ where: { postId: demoPost.id } });
    assert.ok(poll, 'Demo post should have a poll');
    assert.strictEqual(poll.allowMultiple, true);
    assert.strictEqual(poll.maxSelections, 2);

    const options = await db.poll_option.findAll({ where: { pollId: poll.id } });
    assert.strictEqual(options.length, 4, 'Demo poll should include 4 options');

    // Simulate older/outdated demo content to ensure reseed backfills updates
    await demoPost.update({ text: 'Alte Demo-Beschreibung', published: false, sendAsUser: true });
    await poll.update({ allowMultiple: false, maxSelections: 1, isAnonymous: false });

    // Run again to ensure idempotency for existing instances
    await seedDatabase({ includeDemoData: true });

    const allDemoPosts = await db.post.findAll({
      where: {
        choirId: demoChoir.id,
        title: 'Willkommen im Demo-Chor'
      }
    });
    assert.strictEqual(allDemoPosts.length, 1, 'Demo post should not be duplicated on reseed');

    const refreshedDemoPost = await db.post.findByPk(demoPost.id);
    assert.strictEqual(refreshedDemoPost.published, true, 'Reseed should republish the demo post');
    assert.strictEqual(refreshedDemoPost.sendAsUser, false, 'Reseed should restore sendAsUser=false');
    assert.ok(
      (refreshedDemoPost.text || '').includes('Willkommen bei NAK Chorleiter'),
      'Reseed should synchronize demo text for existing instances'
    );

    const pollAfterReseed = await db.poll.findOne({ where: { postId: demoPost.id } });
    assert.strictEqual(pollAfterReseed.allowMultiple, true, 'Reseed should enforce multi-select poll');
    assert.strictEqual(pollAfterReseed.maxSelections, 2, 'Reseed should enforce maxSelections=2');
    assert.strictEqual(pollAfterReseed.isAnonymous, true, 'Reseed should enforce anonymous poll');
    const optionsAfterReseed = await db.poll_option.findAll({ where: { pollId: pollAfterReseed.id } });
    assert.strictEqual(optionsAfterReseed.length, 4, 'Poll options should not be duplicated on reseed');

    const announcementTitle = 'Probe am Donnerstag – Demo-Ankündigung';
    const announcementPost = await db.post.findOne({
      where: {
        choirId: demoChoir.id,
        title: announcementTitle
      }
    });
    assert.ok(announcementPost, 'Second demo announcement post should be seeded');
    assert.strictEqual(announcementPost.published, true, 'Announcement post should be published');
    assert.ok(
      (announcementPost.text || '').includes('Nächste Probe im Überblick'),
      'Announcement post should contain demo announcement content'
    );

    await announcementPost.update({ text: 'Veralteter Ankündigungstext', published: false, sendAsUser: true });
    await seedDatabase({ includeDemoData: true });

    const allAnnouncementPosts = await db.post.findAll({
      where: {
        choirId: demoChoir.id,
        title: announcementTitle
      }
    });
    assert.strictEqual(allAnnouncementPosts.length, 1, 'Announcement post should not be duplicated on reseed');

    const refreshedAnnouncementPost = await db.post.findByPk(announcementPost.id);
    assert.strictEqual(refreshedAnnouncementPost.published, true, 'Reseed should republish announcement post');
    assert.strictEqual(refreshedAnnouncementPost.sendAsUser, false, 'Reseed should restore announcement sendAsUser=false');
    assert.ok(
      (refreshedAnnouncementPost.text || '').includes('Nächste Probe im Überblick'),
      'Reseed should synchronize announcement post text'
    );

    console.log('seed.demo-post tests passed');
    await db.sequelize.close();
  } catch (err) {
    console.error(err);
    await db.sequelize.close();
    process.exit(1);
  }
})();
