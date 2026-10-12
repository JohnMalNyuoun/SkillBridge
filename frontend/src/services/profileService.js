import api from './api';

export const getYouthProfile = async () => {
  const response = await api.get('/youth/profile');
  return response.data;
};

export const updateYouthProfile = async (payload) => {
  const response = await api.put('/youth/profile', payload);
  return response.data;
};

export const updateYouthPhoto = async (formData) => {
  const response = await api.put('/youth/profile/photo', formData);
  return response.data;
};

export const changeYouthPassword = async (payload) => {
  const response = await api.put('/youth/profile/password', payload);
  return response.data;
};

export const requestYouthPasswordChangeCode = async () => {
  const response = await api.post('/youth/profile/password/request-code');
  return response.data;
};

export const changeOrgPassword = async (payload) => {
  const response = await api.put('/org/profile/password', payload);
  return response.data;
};

export const requestOrgPasswordChangeCode = async () => {
  const response = await api.post('/org/profile/password/request-code');
  return response.data;
};

export const changeYouthName = async (payload) => {
  const response = await api.put('/youth/profile/name', payload);
  return response.data;
};

export const requestYouthEmailChange = async (newEmail) => {
  const response = await api.put('/youth/profile/email/request-change', { newEmail });
  return response.data;
};

export const verifyYouthEmailChange = async (token) => {
  const response = await api.put('/youth/profile/email/verify', { token });
  return response.data;
};

export const updateYouthTheme = async (theme) => {
  const response = await api.put('/youth/profile/theme', { theme });
  return response.data;
};

export const updateYouthNotifications = async (notificationsEnabled) => {
  const response = await api.put('/youth/profile/notifications', { notificationsEnabled });
  return response.data;
};

export const getOrgProfile = async () => {
  const response = await api.get('/org/profile');
  return response.data;
};

export const updateOrgProfile = async (payload) => {
  const response = await api.put('/org/profile', payload);
  return response.data;
};

export const updateOrgLogo = async (formData) => {
  const response = await api.put('/org/profile/logo', formData);
  return response.data;
};

export const updateYouthLanguage = async (language) => {
  const response = await api.put('/youth/profile/language', { language });
  return response.data;
};

export const updateOrgLanguage = async (language) => {
  const response = await api.put('/org/profile/language', { language });
  return response.data;
};
