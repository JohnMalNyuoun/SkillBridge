import api from './api';

export const startCourseCall = async (courseId) => {
  const response = await api.post(`/org/courses/${courseId}/group-calls`);
  return response.data;
};

export const getCallSession = async (callSessionId) => {
  const response = await api.get(`/call-sessions/${callSessionId}`);
  return response.data;
};

export const endCallSession = async (callSessionId) => {
  const response = await api.post(`/call-sessions/${callSessionId}/end`);
  return response.data;
};

export const declineCallSession = async (callSessionId) => {
  const response = await api.post(`/call-sessions/${callSessionId}/decline`);
  return response.data;
};
