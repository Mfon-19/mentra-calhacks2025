import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
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
      metadata: {
        size: screenshotResult.size,
        display: screenshotResult.display,
        timestamp: new Date().toISOString()
      }
    });
    
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

export default api;




