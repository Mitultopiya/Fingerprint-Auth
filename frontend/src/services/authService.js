import api from './api';

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const webauthnService = {
  registrationOptions: () => api.post('/webauthn/register/options'),
  verifyRegistration: (body) => api.post('/webauthn/register/verify', body),
  loginOptions: (email) => api.post('/webauthn/login/options', { email }),
  verifyLogin: (body, email) =>
    api.post('/webauthn/login/verify', { ...body, email }),
  listCredentials: () => api.get('/webauthn/credentials'),
  deleteCredential: (id) => api.delete(`/webauthn/credentials/${id}`),
};
