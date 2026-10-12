import api from './api';

export const youthRegister = async (data) => {
  const response = await api.post('/auth/youth/register', data);
  return response.data;
};

export const youthLogin = async (data) => {
  const response = await api.post('/auth/youth/login', data);
  return response.data;
};

export const orgRegister = async (data) => {
  const response = await api.post('/auth/org/register', data);
  return response.data;
};

export const orgLogin = async (data) => {
  const response = await api.post('/auth/org/login', data);
  return response.data;
};

export const orgReinstateRequest = async (data) => {
  const response = await api.post('/auth/org/reinstate-request', data);
  return response.data;
};

export const verifyRegistrationEmail = async (data) => {
  const response = await api.post('/auth/verification/email/verify-registration', data);
  return response.data;
};

export const resendRegistrationCode = async (data) => {
  const response = await api.post('/auth/verification/email/resend-registration', data);
  return response.data;
};

export const requestPasswordReset = async (data) => {
  const response = await api.post('/auth/verification/password/forgot', data);
  return response.data;
};

export const resetPassword = async (data) => {
  const response = await api.post('/auth/verification/password/reset', data);
  return response.data;
};