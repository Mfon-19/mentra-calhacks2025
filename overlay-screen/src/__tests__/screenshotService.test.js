/**
 * Screenshot Service Unit Tests
 * Tests the screenshot service functionality
 * 
 * Run with: npm test
 */

// Mock Electron API
const mockElectronAPI = {
  takeScreenshot: jest.fn()
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Import the service after mocking
const screenshotService = require('../services/screenshotService').default;

describe('ScreenshotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation
    mockElectronAPI.takeScreenshot.mockResolvedValue({
      success: true,
      data: 'mock-base64-data',
      size: 1024,
      display: { width: 1920, height: 1080 }
    });
  });

  describe('isAvailable', () => {
    it('should return true when electronAPI is available', () => {
      expect(screenshotService.isAvailable()).toBe(true);
    });

    it('should return false when electronAPI is not available', () => {
      delete window.electronAPI;
      const newService = require('../services/screenshotService').default;
      expect(newService.isAvailable()).toBe(false);
    });
  });

  describe('capture', () => {
    it('should capture screenshot successfully', async () => {
      const result = await screenshotService.capture();
      
      expect(mockElectronAPI.takeScreenshot).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        data: 'mock-base64-data',
        size: 1024,
        display: { width: 1920, height: 1080 },
        timestamp: expect.any(String)
      });
    });

    it('should throw error when electronAPI is not available', async () => {
      delete window.electronAPI;
      const newService = require('../services/screenshotService').default;
      
      await expect(newService.capture()).rejects.toThrow(
        'Screenshot functionality not available in this environment'
      );
    });

    it('should throw error when screenshot capture fails', async () => {
      mockElectronAPI.takeScreenshot.mockResolvedValue({
        success: false,
        error: 'Screenshot failed'
      });

      await expect(screenshotService.capture()).rejects.toThrow('Screenshot failed');
    });
  });

  describe('captureAsDataURL', () => {
    it('should return data URL format', async () => {
      const dataURL = await screenshotService.captureAsDataURL();
      
      expect(dataURL).toBe('data:image/png;base64,mock-base64-data');
    });
  });

  describe('captureAndAnalyze', () => {
    beforeEach(() => {
      axios.post.mockResolvedValue({
        data: {
          message: 'Screenshot analyzed successfully',
          status: 'success',
          analysis: { result: 'mock analysis' }
        }
      });
    });

    it('should capture and analyze screenshot', async () => {
      const result = await screenshotService.captureAndAnalyze();
      
      expect(mockElectronAPI.takeScreenshot).toHaveBeenCalledTimes(1);
      expect(axios.post).toHaveBeenCalledWith('/screenshot', {
        image: 'mock-base64-data',
        metadata: {
          size: 1024,
          display: { width: 1920, height: 1080 },
          timestamp: expect.any(String)
        }
      });
      expect(result).toEqual({
        success: true,
        analysis: { result: 'mock analysis' },
        timestamp: expect.any(String)
      });
    });

    it('should handle API errors', async () => {
      axios.post.mockRejectedValue(new Error('API Error'));
      
      await expect(screenshotService.captureAndAnalyze()).rejects.toThrow('API Error');
    });
  });

  describe('captureAndDownload', () => {
    beforeEach(() => {
      // Mock DOM methods
      document.createElement = jest.fn(() => ({
        download: '',
        href: '',
        click: jest.fn()
      }));
      document.body = {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      };
    });

    it('should download screenshot with default filename', async () => {
      const result = await screenshotService.captureAndDownload();
      
      expect(result.success).toBe(true);
      expect(result.filename).toMatch(/screenshot-\d+\.png/);
    });

    it('should download screenshot with custom filename', async () => {
      const result = await screenshotService.captureAndDownload('custom.png');
      
      expect(result.success).toBe(true);
      expect(result.filename).toBe('custom.png');
    });
  });
});




