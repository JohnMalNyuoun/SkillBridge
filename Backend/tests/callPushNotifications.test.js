const test = require('node:test');
const assert = require('node:assert/strict');
const { sendCallPushNotifications } = require('../services/callPushNotifications');

const tokenQuery = (records) => ({
  select() {
    return this;
  },
  lean: async () => records
});

test('call push sends one stable notification identity per recipient and respects preferences', async () => {
  const messages = [];
  const activeSessionId = 'ffffffffffffffffffffffff';
  const recipients = [
    {
      accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      accountModel: 'User',
      notificationsEnabled: true,
      expiresAt: new Date(Date.now() + 30000),
      data: {
        type: 'incoming_call',
        callSessionId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        notificationId: 'cccccccccccccccccccccccc'
      }
    },
    {
      accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      accountModel: 'User',
      notificationsEnabled: true,
      data: {
        type: 'incoming_call',
        callSessionId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        notificationId: 'cccccccccccccccccccccccc'
      }
    },
    {
      accountId: 'dddddddddddddddddddddddd',
      accountModel: 'Organisation',
      notificationsEnabled: false,
      data: {
        type: 'incoming_call',
        callSessionId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
        notificationId: 'eeeeeeeeeeeeeeeeeeeeeeee'
      }
    }
  ];
  const PushTokenModel = {
    find: (filter) => {
      assert.equal(filter.$or.length, 1);
      return tokenQuery([{
        _id: '111111111111111111111111',
        accountId: recipients[0].accountId,
        accountModel: 'User',
        refreshSessionId: activeSessionId,
        token: 'fcm-token-for-youth-device-123456789'
      }]);
    },
    deleteMany: async () => ({ deletedCount: 0 })
  };
  const RefreshSessionModel = {
    find: () => tokenQuery([{ _id: activeSessionId }])
  };
  const messaging = {
    sendEach: async (batch) => {
      messages.push(...batch);
      return { responses: batch.map(() => ({ success: true })) };
    }
  };

  const result = await sendCallPushNotifications(recipients, {
    PushTokenModel,
    RefreshSessionModel,
    getMessagingClient: () => messaging
  });

  assert.deepEqual(result, { sentCount: 1, removedTokenCount: 0 });
  assert.equal(messages.length, 1);
  assert.equal(messages[0].data.notificationId, 'cccccccccccccccccccccccc');
  assert.equal(messages[0].data.callSessionId, 'bbbbbbbbbbbbbbbbbbbbbbbb');
  assert.equal(messages[0].android.priority, 'high');
});

test('call push removes invalid FCM registrations without exposing tokens', async () => {
  const token = 'invalid-fcm-token-do-not-log-123456789';
  const deletedFilters = [];
  const activeSessionId = 'ffffffffffffffffffffffff';
  const PushTokenModel = {
    find: () => tokenQuery([{
      _id: '111111111111111111111111',
      accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      accountModel: 'User',
      refreshSessionId: activeSessionId,
      token
    }]),
    deleteMany: async (filter) => {
      deletedFilters.push(filter);
      return { deletedCount: 1 };
    }
  };
  const RefreshSessionModel = {
    find: () => tokenQuery([{ _id: activeSessionId }])
  };
  const messaging = {
    sendEach: async () => ({
      responses: [{
        success: false,
        error: { code: 'messaging/registration-token-not-registered' }
      }]
    })
  };

  const result = await sendCallPushNotifications([{
    accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    accountModel: 'User',
    data: { type: 'incoming_call', notificationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }
  }], {
    PushTokenModel,
    RefreshSessionModel,
    getMessagingClient: () => messaging
  });

  assert.deepEqual(result, { sentCount: 0, removedTokenCount: 1 });
  assert.deepEqual(deletedFilters, [{ token: { $in: [token] } }]);
});

test('Firebase delivery failure is reported without throwing into call creation', async () => {
  const warnings = [];
  const PushTokenModel = {
    find: () => tokenQuery([{
      _id: '111111111111111111111111',
      accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      accountModel: 'User',
      refreshSessionId: 'ffffffffffffffffffffffff',
      token: 'fcm-token-for-youth-device-123456789'
    }])
  };
  const RefreshSessionModel = {
    find: () => tokenQuery([{ _id: 'ffffffffffffffffffffffff' }])
  };

  const result = await sendCallPushNotifications([{
    accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    accountModel: 'User',
    data: { type: 'incoming_call', notificationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }
  }], {
    PushTokenModel,
    RefreshSessionModel,
    getMessagingClient: () => {
      throw Object.assign(new Error('Firebase is unavailable'), { code: 'unavailable' });
    },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.deepEqual(result, {
    sentCount: 0,
    removedTokenCount: 0,
    failed: true
  });
  assert.deepEqual(warnings, [['Firebase call push delivery failed:', 'unavailable']]);
});

test('push tokens tied to expired or revoked sessions are removed before delivery', async () => {
  const deletedFilters = [];
  let sendCalled = false;
  const PushTokenModel = {
    find: () => tokenQuery([{
      _id: '111111111111111111111111',
      accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      accountModel: 'User',
      refreshSessionId: 'ffffffffffffffffffffffff',
      token: 'stale-fcm-token-do-not-log-123456789'
    }]),
    deleteMany: async (filter) => {
      deletedFilters.push(filter);
      return { deletedCount: 1 };
    }
  };
  const RefreshSessionModel = {
    find: () => tokenQuery([])
  };

  const result = await sendCallPushNotifications([{
    accountId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    accountModel: 'User',
    data: { type: 'incoming_call', notificationId: 'bbbbbbbbbbbbbbbbbbbbbbbb' }
  }], {
    PushTokenModel,
    RefreshSessionModel,
    getMessagingClient: () => {
      sendCalled = true;
      return { sendEach: async () => ({ responses: [] }) };
    }
  });

  assert.deepEqual(result, { sentCount: 0, removedTokenCount: 0 });
  assert.equal(sendCalled, false);
  assert.deepEqual(deletedFilters, [{
    _id: { $in: ['111111111111111111111111'] }
  }]);
});
