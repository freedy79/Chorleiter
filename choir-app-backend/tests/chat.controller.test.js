const assert = require('assert');

process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = ':memory:';

const db = require('../src/models');
const controller = require('../src/controllers/chat.controller');

function createRes() {
  return {
    statusCode: 200,
    data: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.data = payload;
      return this;
    },
    download(filePath, fileName) {
      this.data = { filePath, fileName };
      return this;
    }
  };
}

(async () => {
  try {
    await db.sequelize.sync({ force: true });

    const choir = await db.choir.create({ name: 'Test Choir' });
    const director = await db.user.create({ email: 'director@example.com', roles: ['user'] });
    const memberA = await db.user.create({ email: 'a@example.com', roles: ['user'] });
    const memberB = await db.user.create({ email: 'b@example.com', roles: ['user'] });

    await db.user_choir.bulkCreate([
      { userId: director.id, choirId: choir.id, rolesInChoir: ['director'] },
      { userId: memberA.id, choirId: choir.id, rolesInChoir: ['singer'] },
      { userId: memberB.id, choirId: choir.id, rolesInChoir: ['singer'] }
    ]);

    let res = createRes();

    await controller.getRooms({ userId: memberA.id, activeChoirId: choir.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.data));
    assert.strictEqual(res.data.length, 1);
    assert.strictEqual(res.data[0].key, 'allgemein');

    const roomId = res.data[0].id;

    res = createRes();
    await controller.createMessage({
      params: { roomId },
      body: { text: 'Hallo Chor!' },
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.text, 'Hallo Chor!');
    const parentId = res.data.id;

    res = createRes();
    await controller.createMessage({
      params: { roomId },
      body: { text: 'Antwort', replyToMessageId: parentId },
      userId: memberB.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 201);
    const firstReplyId = res.data.id;

    res = createRes();
    await controller.createMessage({
      params: { roomId },
      body: { text: 'Antwort auf Antwort', replyToMessageId: firstReplyId },
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 400);

    res = createRes();
    await controller.getRoomMessages({
      params: { roomId },
      query: {},
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.messages.length, 2);
    assert.ok(res.data.cursor);
    assert.ok(res.data.realtime);

    // Cursor mode for realtime upgrades (afterId)
    res = createRes();
    await controller.getRoomMessages({
      params: { roomId },
      query: { afterId: String(parentId) },
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.messages.length, 1);
    assert.strictEqual(res.data.messages[0].id, firstReplyId);
    assert.strictEqual(res.data.realtime.cursorType, 'afterId');

    res = createRes();
    await controller.getUnreadSummary({ userId: memberB.id, activeChoirId: choir.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.totalUnread, 1);

    res = createRes();
    await controller.markRoomRead({
      params: { roomId },
      body: {},
      userId: memberB.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);

    res = createRes();
    await controller.getUnreadSummary({ userId: memberB.id, activeChoirId: choir.id, userRoles: [] }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.totalUnread, 0);

    // Edit within window (owner)
    res = createRes();
    await controller.updateMessage({
      params: { id: parentId },
      body: { text: 'Hallo zusammen!' },
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.text, 'Hallo zusammen!');

    // Edit outside window should fail for owner
    const oldDate = new Date(Date.now() - (16 * 60 * 1000));
    await db.chat_message.update({ createdAt: oldDate }, { where: { id: parentId }, silent: true });
    res = createRes();
    await controller.updateMessage({
      params: { id: parentId },
      body: { text: 'Zu spät' },
      userId: memberA.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 403);

    // Director can moderate-delete foreign messages
    res = createRes();
    await controller.deleteMessage({
      params: { id: parentId },
      userId: director.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 204);

    const deleted = await db.chat_message.findByPk(parentId);
    assert.ok(deleted.deletedAt);

    // Default room can be created for newly added choir via createRoom endpoint for director
    const secondChoir = await db.choir.create({ name: 'Zweiter Chor' });
    await db.user_choir.create({ userId: director.id, choirId: secondChoir.id, rolesInChoir: ['director'] });

    res = createRes();
    await controller.createRoom({
      body: { key: 'probenorga', title: '#Probenorga' },
      userId: director.id,
      activeChoirId: secondChoir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.data.key, 'probenorga');

    // Director can update private room title and members
    res = createRes();
    await controller.createRoom({
      body: {
        key: 'orga-team',
        title: '#Orga Team',
        isPrivate: true,
        memberUserIds: [memberA.id]
      },
      userId: director.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 201);
    const editableRoomId = res.data.id;

    res = createRes();
    await controller.getRoomDetail({
      params: { roomId: editableRoomId },
      userId: director.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.data.memberUserIds));
    assert.ok(res.data.memberUserIds.includes(memberA.id));

    res = createRes();
    await controller.updateRoom({
      params: { roomId: editableRoomId },
      body: {
        title: '#Orga Plus',
        isPrivate: true,
        memberUserIds: [memberB.id]
      },
      userId: director.id,
      activeChoirId: choir.id,
      userRoles: []
    }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.title, '#Orga Plus');
    assert.ok(Array.isArray(res.data.memberUserIds));
    assert.ok(res.data.memberUserIds.includes(memberB.id));
    assert.ok(res.data.memberUserIds.includes(director.id));

    console.log('chat.controller tests passed');
    await db.sequelize.close();
  } catch (error) {
    console.error(error);
    await db.sequelize.close();
    process.exit(1);
  }
})();
