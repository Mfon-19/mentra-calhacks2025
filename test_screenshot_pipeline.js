/**
 * Screenshot Pipeline Test
 * Tests the complete screenshot capture and analysis pipeline
 * 
 * Run with: node test_screenshot_pipeline.js
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const BACKEND_URL = 'http://localhost:5000';
const TEST_TIMEOUT = 30000; // 30 seconds

class ScreenshotPipelineTest {
  constructor() {
    this.backendProcess = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Log test results
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  /**
   * Record test result
   */
  recordTest(testName, passed, error = null) {
    this.testResults.tests.push({
      name: testName,
      passed,
      error: error?.message || null,
      timestamp: new Date().toISOString()
    });
    
    if (passed) {
      this.testResults.passed++;
      this.log(`PASS: ${testName}`, 'success');
    } else {
      this.testResults.failed++;
      this.log(`FAIL: ${testName} - ${error?.message || 'Unknown error'}`, 'error');
    }
  }

  /**
   * Start the Flask backend
   */
  async startBackend() {
    return new Promise((resolve, reject) => {
      this.log('Starting Flask backend...');
      
      const backendPath = path.join(__dirname, 'backend');
      this.backendProcess = spawn('python', ['app.py'], {
        cwd: backendPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let backendReady = false;
      const timeout = setTimeout(() => {
        if (!backendReady) {
          this.backendProcess.kill();
          reject(new Error('Backend startup timeout'));
        }
      }, 10000);

      this.backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Running on http://127.0.0.1:5000')) {
          backendReady = true;
          clearTimeout(timeout);
          this.log('Backend started successfully');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data) => {
        console.error('Backend error:', data.toString());
      });

      this.backendProcess.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Stop the Flask backend
   */
  async stopBackend() {
    if (this.backendProcess) {
      this.log('Stopping Flask backend...');
      this.backendProcess.kill();
      this.backendProcess = null;
    }
  }

  /**
   * Test backend health endpoint
   */
  async testBackendHealth() {
    try {
      const response = await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.recordTest('Backend Health Check', true);
        return true;
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.recordTest('Backend Health Check', false, error);
      return false;
    }
  }

  /**
   * Test screenshot endpoint with mock data
   */
  async testScreenshotEndpoint() {
    try {
      // Create mock screenshot data (small base64 PNG)
      const mockImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const response = await axios.post(`${BACKEND_URL}/screenshot`, {
        image: mockImageData,
        metadata: {
          size: 100,
          display: { width: 1920, height: 1080 },
          timestamp: new Date().toISOString()
        }
      }, { timeout: 10000 });

      if (response.status === 200 && response.data.status === 'success') {
        this.recordTest('Screenshot Endpoint', true);
        this.log(`Analysis result: ${JSON.stringify(response.data.analysis, null, 2)}`);
        return true;
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.recordTest('Screenshot Endpoint', false, error);
      return false;
    }
  }

  /**
   * Test API routes
   */
  async testApiRoutes() {
    const routes = [
      { name: 'API Test Endpoint', url: '/api/test', method: 'GET' },
      { name: 'API Data Endpoint', url: '/api/data', method: 'GET' },
      { name: 'API Files Endpoint', url: '/api/files', method: 'GET' }
    ];

    for (const route of routes) {
      try {
        const response = await axios({
          method: route.method,
          url: `${BACKEND_URL}${route.url}`,
          timeout: 5000
        });

        if (response.status === 200) {
          this.recordTest(route.name, true);
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }
      } catch (error) {
        this.recordTest(route.name, false, error);
      }
    }
  }

  /**
   * Test lesson plan generation endpoint
   */
  async testLessonPlanEndpoint() {
    try {
      const response = await axios.post(`${BACKEND_URL}/api/generate-lesson-plan`, {
        title: 'Test Lesson Plan',
        subject: 'Mathematics',
        grade_level: 'Elementary',
        duration: 60
      }, { timeout: 10000 });

      if (response.status === 202 && response.data.message) {
        this.recordTest('Lesson Plan Generation', true);
        return true;
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.recordTest('Lesson Plan Generation', false, error);
      return false;
    }
  }

  /**
   * Test media endpoints
   */
  async testMediaEndpoints() {
    // Test display output endpoint
    try {
      const response = await axios.post(`${BACKEND_URL}/api/display-output`, {
        type: 'text',
        content: 'Test content',
        format: 'plain'
      }, { timeout: 5000 });

      if (response.status === 200 && response.data.message) {
        this.recordTest('Display Output Endpoint', true);
      } else {
        throw new Error(`Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.recordTest('Display Output Endpoint', false, error);
    }
  }

  /**
   * Test frontend service files exist
   */
  async testFrontendServices() {
    const fs = require('fs');
    const services = [
      'frontend/src/services/apiService.js',
      'frontend/src/services/screenshotService.js',
      'overlay-screen/src/services/apiService.js',
      'overlay-screen/src/services/screenshotService.js'
    ];

    for (const service of services) {
      const servicePath = path.join(__dirname, service);
      try {
        if (fs.existsSync(servicePath)) {
          this.recordTest(`Service File: ${service}`, true);
        } else {
          throw new Error(`File not found: ${servicePath}`);
        }
      } catch (error) {
        this.recordTest(`Service File: ${service}`, false, error);
      }
    }
  }

  /**
   * Test Electron main process has screenshot functionality
   */
  async testElectronScreenshotSetup() {
    const fs = require('fs');
    const mainJsPath = path.join(__dirname, 'main.js');
    const preloadJsPath = path.join(__dirname, 'preload.js');

    try {
      const mainContent = fs.readFileSync(mainJsPath, 'utf8');
      const preloadContent = fs.readFileSync(preloadJsPath, 'utf8');

      const hasDesktopCapturer = mainContent.includes('desktopCapturer');
      const hasScreenshotHandler = mainContent.includes('take-screenshot');
      const hasPreloadExposure = preloadContent.includes('takeScreenshot');

      if (hasDesktopCapturer && hasScreenshotHandler && hasPreloadExposure) {
        this.recordTest('Electron Screenshot Setup', true);
      } else {
        throw new Error('Missing screenshot functionality in Electron files');
      }
    } catch (error) {
      this.recordTest('Electron Screenshot Setup', false, error);
    }
  }

  /**
   * Run all tests
   */
  async runTests() {
    this.log('Starting Screenshot Pipeline Tests...');
    this.log('=' .repeat(50));

    try {
      // Test file structure first
      await this.testFrontendServices();
      await this.testElectronScreenshotSetup();

      // Start backend
      await this.startBackend();
      
      // Wait a moment for backend to fully start
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Test backend endpoints
      const healthOk = await this.testBackendHealth();
      if (!healthOk) {
        throw new Error('Backend health check failed, skipping API tests');
      }

      await this.testApiRoutes();
      await this.testScreenshotEndpoint();
      await this.testLessonPlanEndpoint();
      await this.testMediaEndpoints();

    } catch (error) {
      this.log(`Test suite error: ${error.message}`, 'error');
    } finally {
      await this.stopBackend();
      this.printResults();
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    this.log('=' .repeat(50));
    this.log('TEST RESULTS SUMMARY');
    this.log('=' .repeat(50));
    
    this.log(`Total Tests: ${this.testResults.passed + this.testResults.failed}`);
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'success');
    
    if (this.testResults.failed > 0) {
      this.log('\nFAILED TESTS:');
      this.testResults.tests
        .filter(test => !test.passed)
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }

    this.log('\nScreenshot Pipeline Test Complete!');
    
    if (this.testResults.failed === 0) {
      this.log('🎉 All tests passed! Screenshot pipeline is ready.', 'success');
    } else {
      this.log('⚠️  Some tests failed. Check the errors above.', 'error');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ScreenshotPipelineTest();
  tester.runTests().catch(console.error);
}

module.exports = ScreenshotPipelineTest;




