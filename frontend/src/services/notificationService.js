import api from './api';

export const getNotifications = async () => {
  const response = await api.get('/youth/notifications');
  return response.data;
};

export const markAsRead = async (id) => {
  const response = await api.put(`/youth/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async () => {
  const response = await api.put('/youth/notifications/read-all');
  return response.data;
};

export const getUnreadCount = async () => {
  const response = await api.get('/youth/notifications/unread-count');
  return response.data;
};

export const getOrgNotifications = async () => {
  const response = await api.get('/org/notifications');
  return response.data;
};