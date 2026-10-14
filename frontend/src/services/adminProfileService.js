import api from './api';

export const getAdminProfile = async () => {
  const response = await api.get('/admin/profile');
  return response.data;
};

export const updateAdminPhoto = async (formData) => {
  const response = await api.put('/admin/profile/photo', formData);
  return response.data;
};

export const removeAdminPhoto = async () => {
  const response = await api.delete('/admin/profile/photo');
  return response.data;
};
