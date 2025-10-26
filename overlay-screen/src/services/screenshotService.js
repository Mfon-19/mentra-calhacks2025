import { takeScreenshot, sendScreenshot } from './apiService';

/**
 * Screenshot Service for Overlay Screen
 * Handles screenshot capture and processing in the Electron overlay window
 */
class ScreenshotService {
  constructor() {
    this.isElectron = !!(window.electronAPI && window.electronAPI.takeScreenshot);
  }

  /**
   * Check if screenshot functionality is available
   * @returns {boolean} True if available
   */
  isAvailable() {
    return this.isElectron;
  }

  /**
   * Take a screenshot and return the raw data
   * @returns {Promise<Object>} Screenshot data with base64 image
   */
  async capture() {
    if (!this.isAvailable()) {
      throw new Error('Screenshot functionality not available in this environment');
    }

    try {
      const result = await takeScreenshot();
      return {
        success: true,
        data: result.data,
        size: result.size,
        display: result.display,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
  }

  /**
   * Take a screenshot and send it to the backend for analysis
   * @returns {Promise<Object>} Backend response with analysis
   */
  async captureAndAnalyze() {
    if (!this.isAvailable()) {
      throw new Error('Screenshot functionality not available in this environment');
    }

    try {
      const result = await sendScreenshot();
      return {
        success: true,
        analysis: result.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Screenshot analysis failed:', error);
      throw error;
    }
  }

  /**
   * Take a screenshot and return it as a data URL for display
   * @returns {Promise<string>} Data URL of the screenshot
   */
  async captureAsDataURL() {
    try {
      const result = await this.capture();
      return `data:image/png;base64,${result.data}`;
    } catch (error) {
      console.error('Screenshot data URL generation failed:', error);
      throw error;
    }
  }

  /**
   * Take a screenshot and download it
   * @param {string} filename - Optional filename for download
   */
  async captureAndDownload(filename = null) {
    try {
      const dataURL = await this.captureAsDataURL();
      const link = document.createElement('a');
      link.download = filename || `screenshot-${Date.now()}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, filename: link.download };
    } catch (error) {
      console.error('Screenshot download failed:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const screenshotService = new ScreenshotService();
export default screenshotService;

// Export the class for testing or multiple instances
export { ScreenshotService };




