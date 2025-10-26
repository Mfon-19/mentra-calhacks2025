import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// API Service Functions

// Lesson Plan Services
export const generateLessonPlan = async (data) => {
  try {
    const response = await api.post('/generate-lesson-plan', data);
    return response;
  } catch (error) {
    throw error;
  }
};

// Media Services
export const sendImage = async (formData) => {
  try {
    const response = await api.post('/send-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const displayOutput = async (data) => {
  try {
    const response = await api.post('/display-output', data);
    return response;
  } catch (error) {
    throw error;
  }
};

// General API Services
export const getData = async () => {
  try {
    const response = await api.get('/data');
    return response;
  } catch (error) {
    throw error;
  }
};

export const createData = async (data) => {
  try {
    const response = await api.post('/data', data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const getFiles = async () => {
  try {
    const response = await api.get('/files');
    return response;
  } catch (error) {
    throw error;
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response;
  } catch (error) {
    throw error;
  }
};

// Screenshot Services
export const takeScreenshot = async () => {
  try {
    // Check if we're in Electron environment
    if (window.electronAPI && window.electronAPI.takeScreenshot) {
      const screenshotResult = await window.electronAPI.takeScreenshot();
      
      if (!screenshotResult.success) {
        throw new Error(screenshotResult.error || 'Failed to take screenshot');
      }
      
      return screenshotResult;
    } else {
      throw new Error('Screenshot functionality not available in this environment');
    }
  } catch (error) {
    throw error;
  }
};

export const sendScreenshot = async () => {
  try {
    // Take screenshot first
    const screenshotResult = await takeScreenshot();
    
    if (!screenshotResult.success) {
      throw new Error(screenshotResult.error || 'Failed to take screenshot');
    }
    
    // Send to backend /screenshot endpoint
    const response = await api.post('/screenshot', {
      image: screenshotResult.data,
    });
    
    return response;
  } catch (error) {
    throw error;
  }
};

export default api;
