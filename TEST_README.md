# Screenshot Pipeline Tests

This directory contains comprehensive tests for the screenshot capture and analysis pipeline.

## Test Files

### 1. `test_integration.js` - Quick Integration Test
**Purpose**: Simple test to verify the basic pipeline works
**Run**: `npm test` or `node test_integration.js`

**What it tests**:
- ✅ Backend startup and health check
- ✅ Screenshot endpoint with mock data
- ✅ Basic API functionality

### 2. `test_screenshot_pipeline.js` - Comprehensive Test Suite
**Purpose**: Full test suite covering all components
**Run**: `npm run test-full` or `node test_screenshot_pipeline.js`

**What it tests**:
- ✅ File structure and service files exist
- ✅ Electron screenshot setup (main.js, preload.js)
- ✅ Backend health and all API endpoints
- ✅ Screenshot endpoint with mock data
- ✅ Lesson plan generation endpoint
- ✅ Media endpoints
- ✅ Complete error handling

### 3. `overlay-screen/src/__tests__/screenshotService.test.js` - Unit Tests
**Purpose**: Unit tests for the screenshot service
**Run**: `npm run test-overlay` or `cd overlay-screen && npm test`

**What it tests**:
- ✅ Screenshot service availability detection
- ✅ Screenshot capture functionality
- ✅ Data URL generation
- ✅ Backend API integration
- ✅ Error handling scenarios
- ✅ Download functionality

## Running Tests

### Quick Test (Recommended)
```bash
npm test
```
This runs the integration test to verify the basic pipeline works.

### Full Test Suite
```bash
npm run test-full
```
This runs all tests including file structure, backend endpoints, and error handling.

### Unit Tests Only
```bash
npm run test-overlay
```
This runs only the unit tests for the screenshot service.

## Test Requirements

### Prerequisites
- Node.js installed
- Python installed (for Flask backend)
- All dependencies installed (`npm install`)

### Backend Dependencies
The tests will automatically start the Flask backend, but ensure you have:
- Flask installed (`pip install flask`)
- All Python dependencies from `backend/requirements.txt`

## Expected Results

### ✅ Successful Test Run
```
🧪 Testing Screenshot Pipeline Integration...

1️⃣  Starting Flask backend...
✅ Backend started successfully

2️⃣  Testing health endpoint...
✅ Health check passed

3️⃣  Testing screenshot endpoint...
✅ Screenshot endpoint working
📊 Analysis result: { ... }

🎉 All tests passed! Screenshot pipeline is working correctly.
```

### ❌ Common Issues

1. **Backend won't start**: Check Python installation and dependencies
2. **Port 5000 in use**: Kill other processes using port 5000
3. **File not found errors**: Ensure you're running from the project root
4. **Timeout errors**: Backend might be slow to start, increase timeout in test files

## Test Coverage

- **Backend API**: All endpoints tested
- **Screenshot Pipeline**: Complete flow from capture to analysis
- **Error Handling**: Various failure scenarios
- **File Structure**: All required files present
- **Electron Integration**: IPC communication setup
- **Service Layer**: Unit tests for all service methods

## Debugging

If tests fail:
1. Check the console output for specific error messages
2. Verify all dependencies are installed
3. Ensure no other processes are using port 5000
4. Check that all service files exist in the correct locations
5. Verify the backend can start manually: `cd backend && python app.py`




