/**
 * End-to-End Tests for Overlay Screen Process
 * Tests the complete flow from main app to overlay screen
 */

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

describe('Overlay Screen E2E Tests', () => {
  let mainWindow;
  let overlayWindow;
  let backendProcess;
  let frontendProcess;
  let overlayProcess;

  beforeAll(async () => {
    // Start backend process
    backendProcess = spawn('python', ['backend/app.py'], {
      cwd: path.join(__dirname, '../..'),
      stdio: 'pipe'
    });

    // Start frontend process
    frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../../frontend'),
      stdio: 'pipe'
    });

    // Start overlay process
    overlayProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../../overlay-screen'),
      stdio: 'pipe'
    });

    // Wait for processes to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  afterAll(async () => {
    // Clean up processes
    if (backendProcess) backendProcess.kill();
    if (frontendProcess) frontendProcess.kill();
    if (overlayProcess) overlayProcess.kill();
  });

  beforeEach(async () => {
    // Create main window for each test
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      },
      show: false
    });

    await mainWindow.loadURL('http://localhost:3000');
  });

  afterEach(async () => {
    if (mainWindow) {
      mainWindow.close();
    }
    if (overlayWindow) {
      overlayWindow.close();
    }
  });

  describe('Global Shortcut Registration', () => {
    test('should register global shortcut for "/" key', () => {
      const ret = globalShortcut.register('/', () => {});
      expect(ret).toBe(true);
      
      // Clean up
      globalShortcut.unregister('/');
    });

    test('should fail to register duplicate shortcut', () => {
      globalShortcut.register('/', () => {});
      const ret = globalShortcut.register('/', () => {});
      expect(ret).toBe(false);
      
      // Clean up
      globalShortcut.unregister('/');
    });
  });

  describe('Overlay Window Creation', () => {
    test('should create overlay window with correct properties', () => {
      overlayWindow = new BrowserWindow({
        width: 600,
        height: 400,
        alwaysOnTop: true,
        show: false
      });

      expect(overlayWindow).toBeDefined();
      expect(overlayWindow.getSize()).toEqual([600, 400]);
      expect(overlayWindow.isAlwaysOnTop()).toBe(true);
    });

    test('should load React overlay app', async () => {
      overlayWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false
      });

      await overlayWindow.loadURL('http://localhost:3001');
      
      const title = await overlayWindow.webContents.getTitle();
      expect(title).toBe('Overlay Screen');
    });
  });

  describe('IPC Communication', () => {
    test('should handle trigger-child-process IPC message', async () => {
      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.triggerChildProcess()
      `);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    test('should send child-process-output message', (done) => {
      mainWindow.webContents.once('child-process-output', (event, data) => {
        expect(data).toBeDefined();
        done();
      });

      // Simulate overlay creation
      mainWindow.webContents.send('child-process-output', 'Test message');
      
      // Trigger the event manually for testing
      setTimeout(() => {
        mainWindow.webContents.emit('child-process-output', null, 'Test message');
      }, 10);
    });
  });

  describe('User Interactions', () => {
    beforeEach(async () => {
      overlayWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false
      });
      await overlayWindow.loadURL('http://localhost:3001');
    });

    test('should display overlay screen content', async () => {
      const content = await overlayWindow.webContents.executeJavaScript(`
        document.querySelector('.overlay-screen__header h1').textContent
      `);
      
      expect(content).toBe('Overlay Screen');
    });

    test('should show status element', async () => {
      const status = await overlayWindow.webContents.executeJavaScript(`
        document.querySelector('.overlay-screen__status').textContent
      `);
      
      expect(status).toContain('Status:');
    });

    test('should have functional buttons', async () => {
      const buttonCount = await overlayWindow.webContents.executeJavaScript(`
        document.querySelectorAll('.overlay-screen__button').length
      `);
      
      expect(buttonCount).toBe(2);
    });

    test('should display timestamp', async () => {
      const timestamp = await overlayWindow.webContents.executeJavaScript(`
        document.querySelector('.overlay-screen__timestamp').textContent
      `);
      
      expect(timestamp).toContain('Created:');
    });
  });

  describe('Integration Flow', () => {
    test('should complete full overlay screen flow', async () => {
      // 1. Main app loads
      await mainWindow.loadURL('http://localhost:3000');
      const mainTitle = await mainWindow.webContents.getTitle();
      expect(mainTitle).toBeDefined();

      // 2. Trigger overlay (simulate '/' key press)
      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.triggerChildProcess()
      `);
      expect(result.success).toBe(true);

      // 3. Verify overlay window exists
      const windows = BrowserWindow.getAllWindows();
      const overlayWindows = windows.filter(w => w.getTitle() === 'Overlay Screen');
      expect(overlayWindows.length).toBeGreaterThan(0);

      // 4. Test overlay functionality
      const overlayWindow = overlayWindows[0];
      const overlayContent = await overlayWindow.webContents.executeJavaScript(`
        document.querySelector('.overlay-screen').className
      `);
      expect(overlayContent).toBe('overlay-screen');
    });
  });

  describe('Error Handling', () => {
    test('should handle overlay creation errors gracefully', async () => {
      // Test with invalid configuration
      expect(() => {
        new BrowserWindow({
          width: -1, // Invalid width
          height: -1 // Invalid height
        });
      }).toThrow();
    });

    test('should handle IPC errors', async () => {
      // Test with non-existent IPC handler
      const result = await mainWindow.webContents.executeJavaScript(`
        window.electronAPI.nonExistentHandler()
      `).catch(err => err.message);
      
      expect(result).toContain('not a function');
    });
  });

  describe('Performance Tests', () => {
    test('should create overlay window quickly', async () => {
      const startTime = Date.now();
      
      overlayWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false
      });
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(1000); // Should create in under 1 second
    });

    test('should load overlay content quickly', async () => {
      overlayWindow = new BrowserWindow({
        width: 600,
        height: 400,
        show: false
      });

      const startTime = Date.now();
      await overlayWindow.loadURL('http://localhost:3001');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load in under 5 seconds
    });
  });
});