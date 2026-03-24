


const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
import axios from 'axios';
const env = loadEnv(mode, process.cwd(), '');
const api = axios.create({
  baseURL: env.DJANGO_BASE_URL || 'https://auraprod.unthink.ai',
});
export const getFullUserInfo = async (email) => {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const response = await api.get(`/users/get_user_info/?emailId=${normalizedEmail}`);

    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Get user info error:', error);
    return null;
  }
};

export const saveUserInfo = async (userData) => {
  try {
    const response = await api.post('/users/save_user_info/', userData);
    if (response.data.status === 'success') {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to save user info');
    }
  } catch (error) {
    console.error('Save user info error:', error);
    throw new Error('Failed to save user info. Please try again.');
  }
};


export default {
  getFullUserInfo,
  saveUserInfo,

};
