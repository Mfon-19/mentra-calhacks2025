const { spawn } = require('child_process');
const path = require('path');

class BackendManager {
    constructor() {
        this.flaskProcess = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) {
            console.log('Backend is already running');
            return;
        }

        console.log('Starting Flask backend...');
        
        // Get the backend directory path
        const backendDir = path.join(__dirname, '..', 'backend');
        
        // Check if Python is available
        const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
        
        this.flaskProcess = spawn(pythonCommand, ['app.py'], {
            cwd: backendDir,
            stdio: 'pipe'
        });

        this.flaskProcess.stdout.on('data', (data) => {
            console.log(`[Flask] ${data.toString().trim()}`);
        });

        this.flaskProcess.stderr.on('data', (data) => {
            console.error(`[Flask Error] ${data.toString().trim()}`);
        });

        this.flaskProcess.on('close', (code) => {
            console.log(`Flask process exited with code ${code}`);
            this.isRunning = false;
        });

        this.flaskProcess.on('error', (err) => {
            console.error('Failed to start Flask process:', err);
            this.isRunning = false;
        });

        // Wait a moment to see if the process starts successfully
        setTimeout(() => {
            if (this.flaskProcess && !this.flaskProcess.killed) {
                this.isRunning = true;
                console.log('✅ Flask backend started successfully on http://localhost:5000');
            }
        }, 2000);
    }

    stop() {
        if (this.flaskProcess && !this.flaskProcess.killed) {
            console.log('Stopping Flask backend...');
            this.flaskProcess.kill();
            this.isRunning = false;
            console.log('✅ Flask backend stopped');
        } else {
            console.log('Flask backend is not running');
        }
    }

    restart() {
        console.log('Restarting Flask backend...');
        this.stop();
        setTimeout(() => {
            this.start();
        }, 1000);
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            pid: this.flaskProcess ? this.flaskProcess.pid : null
        };
    }
}

// If this script is run directly
if (require.main === module) {
    const backendManager = new BackendManager();
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\nShutting down...');
        backendManager.stop();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\nShutting down...');
        backendManager.stop();
        process.exit(0);
    });

    // Start the backend
    backendManager.start();

    // Keep the process alive
    setInterval(() => {
        // Just keep the process running
    }, 1000);
}

module.exports = BackendManager;
