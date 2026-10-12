import api from './api';

export const getImpactDashboard = async () => {
  const response = await api.get('/org/impact/dashboard');
  return response.data;
};

export const addOutcomeQuestions = async (courseId, data) => {
  const response = await api.post(`/org/impact/courses/${courseId}/outcome-questions`, data);
  return response.data;
};

export const markCompletion = async (applicationId, data) => {
  const response = await api.put(`/org/impact/applications/${applicationId}/completion`, data);
  return response.data;
};

export const getCourseOutcomes = async (courseId) => {
  const response = await api.get(`/org/impact/courses/${courseId}/outcomes`);
  return response.data;
};

export const getPendingOutcomes = async () => {
  const response = await api.get('/youth/outcomes');
  return response.data;
};

export const submitOutcome = async (applicationId, data) => {
  const response = await api.post(`/youth/outcomes/${applicationId}`, data);
  return response.data;
};