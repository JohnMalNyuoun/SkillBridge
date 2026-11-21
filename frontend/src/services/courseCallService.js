import api from './api';

export const startCourseCall = async (courseId, callType) => {
  const response = await api.post(`/org/courses/${courseId}/group-calls`, { callType });
  return response.data;
};

export const getCallSession = async (callSessionId) => {
  const response = await api.get(`/call-sessions/${callSessionId}`);
  return response.data;
};

export const getActiveCourseCall = async (courseId) => {
  const response = await api.get(`/call-sessions/course/${courseId}/active`);
  return response.data;
};

export const endCallSession = async (callSessionId) => {
  const response = await api.post(`/call-sessions/${callSessionId}/end`);
  return response.data;
};

export const acceptCallSession = async (callSessionId) => {
  const response = await api.post(`/call-sessions/${callSessionId}/accept`);
  return response.data;
};

export const declineCallSession = async (callSessionId) => {
  const response = await api.post(`/call-sessions/${callSessionId}/decline`);
  return response.data;
};
