#!/usr/bin/env node

/**
 * Integration Test for Screenshot Pipeline
 * Simple test that can be run to verify the screenshot pipeline works
 * 
 * Usage: node test_integration.js
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';

async function testScreenshotPipeline() {
  console.log('🧪 Testing Screenshot Pipeline Integration...\n');

  let backendProcess = null;

  try {
    // Start backend
    console.log('1️⃣  Starting Flask backend...');
    const backendPath = path.join(__dirname, 'backend');
    backendProcess = spawn('python', ['app.py'], {
      cwd: backendPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for backend to start
    await new Promise((resolve, reject) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          backendProcess.kill();
          reject(new Error('Backend startup timeout'));
        }
      }, 15000); // Increased timeout to 15 seconds

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('Backend output:', output);
        if (output.includes('Running on http://127.0.0.1:5000') || output.includes('Debugger is active')) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.log('Backend stderr:', error);
        // Check for the running message in stderr too
        if (error.includes('Running on http://127.0.0.1:5000') || error.includes('Debugger is active')) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    console.log('✅ Backend started successfully\n');

    // Wait a moment for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test health endpoint
    console.log('2️⃣  Testing health endpoint...');
    const healthResponse = await axios.get(`${BACKEND_URL}/health`);
    if (healthResponse.data.status === 'healthy') {
      console.log('✅ Health check passed\n');
    } else {
      throw new Error('Health check failed');
    }

    // Test screenshot endpoint with mock data
    console.log('3️⃣  Testing screenshot endpoint...');
    const mockImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const screenshotResponse = await axios.post(`${BACKEND_URL}/screenshot`, {
      image: mockImageData,
      metadata: {
        size: 100,
        display: { width: 1920, height: 1080 },
        timestamp: new Date().toISOString()
      }
    });

    if (screenshotResponse.data.status === 'success') {
      console.log('✅ Screenshot endpoint working');
      console.log('📊 Analysis result:', JSON.stringify(screenshotResponse.data.analysis, null, 2));
    } else {
      throw new Error('Screenshot endpoint failed');
    }

    console.log('\n🎉 All tests passed! Screenshot pipeline is working correctly.');
    console.log('\n📋 Next steps:');
    console.log('   - Start the Electron app: npm run dev');
    console.log('   - Press "/" to open overlay screen');
    console.log('   - Use screenshotService.captureAndAnalyze() in overlay-screen');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    if (backendProcess) {
      console.log('\n🛑 Stopping backend...');
      backendProcess.kill();
    }
  }
}

// Run the test
testScreenshotPipeline();
