const Notification = require('../models/Notification');

async function notify({ recipient, actor, type, message, link, entity }) {
  if (!recipient) return null;
  if (actor && String(actor) === String(recipient)) return null;
  try {
    return await Notification.create({ recipient, actor, type, message, link, entity });
  } catch (err) {
    console.error('[notify] failed:', err.message);
    return null;
  }
}

module.exports = { notify };
