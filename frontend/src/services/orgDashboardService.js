import api from './api';

export const getOrgDashboard = async () => {
  const response = await api.get('/org/dashboard');
  return response.data;
};

export const createOrgMember = async (data) => {
  const response = await api.post('/org/create-member', data);
  return response.data;
};
