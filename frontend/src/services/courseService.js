import api from './api';

export const getAllCourses = async (params) => {
  const response = await api.get('/youth/courses', { params });
  return response.data;
};

export const getCourse = async (id) => {
  const response = await api.get(`/youth/courses/${id}`);
  return response.data;
};

export const getCourseEngagement = async (id) => {
  const response = await api.get(`/youth/courses/${id}/engagement`);
  return response.data;
};

export const toggleCourseReaction = async (id) => {
  const response = await api.put(`/youth/courses/${id}/reaction`);
  return response.data;
};

export const addCourseComment = async (id, text) => {
  const response = await api.post(`/youth/courses/${id}/comments`, { text });
  return response.data;
};

export const getOrgCourses = async () => {
  const response = await api.get('/org/courses');
  return response.data;
};

export const getOrgCourse = async (id) => {
  const response = await api.get(`/org/courses/${id}`);
  return response.data;
};

export const createCourse = async (data) => {
  const response = await api.post('/org/courses', data);
  return response.data;
};

export const updateCourse = async (id, data) => {
  const response = await api.put(`/org/courses/${id}`, data);
  return response.data;
};

export const publishCourse = async (id) => {
  const response = await api.put(`/org/courses/${id}/publish`);
  return response.data;
};

export const closeCourse = async (id) => {
  const response = await api.put(`/org/courses/${id}/close`);
  return response.data;
};

export const deleteCourse = async (id) => {
  const response = await api.delete(`/org/courses/${id}`);
  return response.data;
};