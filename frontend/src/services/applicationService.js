import api from './api';

export const applyForCourse = async (courseId, data) => {
  const response = await api.post(`/youth/applications/${courseId}`, data);
  return response.data;
};

export const getMyApplications = async () => {
  const response = await api.get('/youth/applications');
  return response.data;
};

export const withdrawApplication = async (id) => {
  const response = await api.put(`/youth/applications/${id}/withdraw`);
  return response.data;
};

export const getOrgApplications = async (params) => {
  const response = await api.get('/org/applications', { params });
  return response.data;
};

export const shortlistApplicant = async (id, data) => {
  const response = await api.put(`/org/applications/${id}/shortlist`, data);
  return response.data;
};

export const acceptApplicant = async (id) => {
  const response = await api.put(`/org/applications/${id}/accept`);
  return response.data;
};

export const rejectApplicant = async (id, data) => {
  const response = await api.put(`/org/applications/${id}/reject`, data);
  return response.data;
};