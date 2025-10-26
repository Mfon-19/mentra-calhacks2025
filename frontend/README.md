# CalHacks 2025 - React Frontend

This is the React frontend for the CalHacks 2025 educational platform.

## Features

- **Lesson Plan Generation**: Create and manage lesson plans
- **Media Upload**: Upload and process images
- **Display Output**: Process and display various output types
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Navbar.js
│   └── Footer.js
├── pages/              # Page components
│   ├── Home.js
│   ├── LessonPlans.js
│   ├── MediaUpload.js
│   └── DisplayOutput.js
├── services/           # API services
│   └── apiService.js
├── utils/              # Utility functions
│   ├── constants.js
│   └── helpers.js
├── assets/             # Static assets
│   ├── images/
│   └── styles/
├── App.js              # Main app component
├── App.css             # App styles
├── index.js            # Entry point
└── index.css           # Global styles
```

## API Integration

The frontend communicates with the Flask backend through the `apiService.js` file. All API calls are configured to proxy to `http://localhost:5000/api` in development.

### Available API Endpoints

- `POST /api/generate-lesson-plan` - Generate lesson plans
- `POST /api/send-image` - Upload images
- `POST /api/display-output` - Process display output
- `GET /api/data` - Get sample data
- `POST /api/data` - Create data
- `GET /api/files` - List files

## Environment Variables

Create a `.env` file in the frontend directory:

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_DEBUG=true
```

## Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

## Contributing

1. Follow the existing code style
2. Add comments for complex logic
3. Test your changes thoroughly
4. Update documentation as needed
