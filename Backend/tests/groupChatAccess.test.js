const test = require('node:test');
const assert = require('node:assert/strict');
const {
  canAccessChat,
  canManageChatMembers,
  canManageChatModerators,
  isChatAdministrator,
  isRemovedFromChat
} = require('../services/groupChatAccess');

const chat = {
  organisation: 'organisation-id',
  participants: ['student-id'],
  moderators: ['moderator-id']
};

test('organisation admin and assigned moderators can manage group chat members', () => {
  assert.equal(isChatAdministrator(chat, {
    id: 'admin-id',
    role: 'org_admin',
    createdByOrg: 'organisation-id'
  }), true);
  assert.equal(canManageChatMembers(chat, {
    id: 'moderator-id',
    role: 'staff'
  }), true);
});

test('ordinary participants can read chat but cannot manage its members', () => {
  const participant = { id: 'student-id', role: 'youth' };

  assert.equal(canAccessChat(chat, participant), true);
  assert.equal(canManageChatMembers(chat, participant), false);
  assert.equal(canAccessChat(chat, { id: 'other-id', role: 'youth' }), false);
});

test('removed enrolled users do not retain group access', () => {
  const removedChat = {
    ...chat,
    participants: ['student-id'],
    removedParticipants: ['student-id']
  };
  const youth = { id: 'student-id', role: 'youth' };

  assert.equal(isRemovedFromChat(removedChat, youth.id), true);
  assert.equal(canAccessChat(removedChat, youth), false);
});

test('only organisation administrators can appoint or remove chat administrators', () => {
  assert.equal(canManageChatModerators(chat, {
    id: 'org-admin',
    role: 'org_admin',
    createdByOrg: 'organisation-id'
  }), true);
  assert.equal(canManageChatModerators(chat, {
    id: 'moderator-id',
    role: 'staff',
    createdByOrg: 'organisation-id'
  }), false);
});
