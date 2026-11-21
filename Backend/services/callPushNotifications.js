const PushToken = require('../models/PushToken');
const RefreshSession = require('../models/RefreshSession');
const { getFirebaseMessaging } = require('./firebaseAdmin');

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered'
]);

const recipientKey = (recipient) => (
  `${recipient.accountModel}:${recipient.accountId.toString()}`
);

const toStringData = (data) => Object.fromEntries(
  Object.entries(data).filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
);

const sendCallPushNotifications = async (
  recipients,
  {
    respectNotificationsEnabled = true,
    PushTokenModel = PushToken,
    RefreshSessionModel = RefreshSession,
    getMessagingClient = getFirebaseMessaging,
    logger = console,
    now = Date.now()
  } = {}
) => {
  const eligibleRecipients = (recipients || []).filter((recipient) => (
    recipient
    && recipient.accountId
    && recipient.accountModel
    && (!respectNotificationsEnabled || recipient.notificationsEnabled !== false)
  ));
  if (eligibleRecipients.length === 0) return { sentCount: 0, removedTokenCount: 0 };

  const uniqueRecipients = new Map(
    eligibleRecipients.map((recipient) => [recipientKey(recipient), recipient])
  );
  const recipientFilters = [...uniqueRecipients.values()].map((recipient) => ({
    accountId: recipient.accountId,
    accountModel: recipient.accountModel
  }));

  try {
    const tokenQuery = PushTokenModel.find({ $or: recipientFilters });
    const tokenRecords = await tokenQuery.select('+token').lean();
    if (tokenRecords.length === 0) return { sentCount: 0, removedTokenCount: 0 };
    const activeSessionQuery = RefreshSessionModel.find({
      $or: tokenRecords.map((record) => ({
        _id: record.refreshSessionId,
        accountId: record.accountId,
        accountModel: record.accountModel,
        revokedAt: null,
        expiresAt: { $gt: new Date(now) }
      }))
    });
    const activeSessions = await activeSessionQuery.select('_id').lean();
    const activeSessionIds = new Set(activeSessions.map((session) => session._id.toString()));
    const staleTokens = tokenRecords.filter((record) => (
      !activeSessionIds.has(record.refreshSessionId?.toString())
    ));
    if (staleTokens.length > 0) {
      await PushTokenModel.deleteMany({
        _id: { $in: staleTokens.map((record) => record._id) }
      });
    }

    const tokenByRecipient = new Map();
    tokenRecords.forEach((record) => {
      if (!activeSessionIds.has(record.refreshSessionId?.toString())) return;
      const key = `${record.accountModel}:${record.accountId.toString()}`;
      const records = tokenByRecipient.get(key) || [];
      records.push(record);
      tokenByRecipient.set(key, records);
    });

    const messages = [];
    [...uniqueRecipients.entries()].forEach(([key, recipient]) => {
      const data = toStringData(recipient.data || {});
      if (!data.type || !data.notificationId) return;
      const expiry = recipient.expiresAt ? new Date(recipient.expiresAt).getTime() : null;
      const ttlSeconds = expiry === null
        ? 60
        : Math.max(0, Math.ceil((expiry - now) / 1000));
      if (ttlSeconds === 0 && data.type === 'incoming_call') return;

      (tokenByRecipient.get(key) || []).forEach((record) => {
        messages.push({
          token: record.token,
          data,
          android: {
            priority: 'high',
            ttl: `${data.type === 'call_cancelled' ? 0 : ttlSeconds}s`
          }
        });
      });
    });
    if (messages.length === 0) return { sentCount: 0, removedTokenCount: 0 };

    const messaging = getMessagingClient();
    const invalidTokens = [];
    let sentCount = 0;
    for (let index = 0; index < messages.length; index += 500) {
      const batch = messages.slice(index, index + 500);
      const result = await messaging.sendEach(batch);
      result.responses.forEach((response, responseIndex) => {
        if (response.success) {
          sentCount += 1;
          return;
        }
        if (INVALID_TOKEN_CODES.has(response.error?.code)) {
          invalidTokens.push(batch[responseIndex].token);
        }
      });
    }

    if (invalidTokens.length > 0) {
      await PushTokenModel.deleteMany({ token: { $in: invalidTokens } });
    }
    return { sentCount, removedTokenCount: invalidTokens.length };
  } catch (err) {
    logger.warn('Firebase call push delivery failed:', err.code || err.name || 'unknown');
    return { sentCount: 0, removedTokenCount: 0, failed: true };
  }
};

module.exports = { sendCallPushNotifications };
