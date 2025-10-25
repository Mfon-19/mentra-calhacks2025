# CalHacks 2025 - Electron + Flask + React

A desktop application built with Electron, Flask backend, and React frontend for CalHacks 2025.

## Architecture

- **Frontend**: React application served by Electron
- **Backend**: Flask API server running locally
- **Desktop**: Electron wrapper for cross-platform desktop app

## Project Structure

```
calhacks2025/
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── models/             # Database models
│   ├── routes/             # API routes
│   └── utils/              # Utility functions
├── frontend/               # React frontend
│   ├── src/                # React source code
│   ├── public/             # Static assets
│   └── package.json        # Frontend dependencies
├── scripts/                # Build and utility scripts
│   └── start-backend.js    # Backend process manager
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
└── package.json            # Main dependencies and scripts
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Python 3.7 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/FabianSiswanto/calhacks2025.git
cd calhacks2025
```

2. Install dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### Development

1. Start the development environment:
```bash
npm run dev
```

This will:
- Start the Flask backend on http://localhost:5000
- Start the React frontend on http://localhost:3000
- Launch the Electron app

2. Or start components individually:
```bash
# Terminal 1: Start backend
npm run start-backend

# Terminal 2: Start frontend
npm run start-frontend

# Terminal 3: Start Electron
npm start
```

### Building for Production

1. Build the React frontend:
```bash
npm run build
```

2. Create distributable packages:
```bash
# All platforms
npm run dist

# Specific platforms
npm run dist-mac
npm run dist-win
npm run dist-linux
```

## API Endpoints

The Flask backend provides the following endpoints:

- `GET /` - Backend status
- `GET /health` - Health check
- `GET /api/test` - Test endpoint
- `GET /api/data` - Get sample data
- `POST /api/data` - Create new data
- `GET /api/files` - List project files

## Development Notes

- The Flask backend runs on port 5000
- The React frontend runs on port 3000 in development
- Electron loads the React app from the built files in production
- Backend and frontend communicate via HTTP API calls

## Scripts

- `npm start` - Start Electron app
- `npm run dev` - Start development environment
- `npm run start-backend` - Start Flask backend only
- `npm run start-frontend` - Start React frontend only
- `npm run build` - Build React frontend
- `npm run dist` - Create distributable packages

## License

MIT
