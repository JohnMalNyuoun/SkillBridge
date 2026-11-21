const idString = (id) => id?.toString();

const includesId = (ids, id) => ids.some((item) => idString(item) === idString(id));

const isChatAdministrator = (chat, actor) => (
  (actor.role === 'org_admin' && idString(actor.createdByOrg) === idString(chat.organisation)) ||
  (actor.role === 'organisation' && idString(actor.id) === idString(chat.organisation))
);

const isRemovedFromChat = (chat, actorId) => (
  includesId(chat.removedParticipants || [], actorId)
);

const canAccessChat = (chat, actor) => (
  !isRemovedFromChat(chat, actor.id) && (
    isChatAdministrator(chat, actor) ||
    includesId(chat.participants, actor.id) ||
    includesId(chat.moderators, actor.id)
  )
);

const canManageChatMembers = (chat, actor) => (
  isChatAdministrator(chat, actor) ||
  includesId(chat.moderators, actor.id)
);

const canManageChatModerators = (chat, actor) => (
  isChatAdministrator(chat, actor)
);

module.exports = {
  idString,
  includesId,
  isChatAdministrator,
  canAccessChat,
  canManageChatMembers,
  canManageChatModerators,
  isRemovedFromChat
};
