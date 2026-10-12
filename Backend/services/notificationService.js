const Notification = require('../models/Notification');

const notify = async ({
  recipient,
  recipientModel,
  title,
  message,
  type,
  reference,
  referenceModel,
  sender,
  senderModel
}) => {
  try {
    await Notification.create({
      recipient,
      recipientModel,
      title,
      message,
      type,
      reference,
      referenceModel,
      ...(sender ? { sender, senderModel } : {})
    });
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { notify };