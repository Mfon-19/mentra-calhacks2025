# Mentra — CalHacks 12.0

A new way to learn software: instead of juggling a tutorial and your app on different screens, Mentra overlays a translucent, always-on-top window that tells you the next step right where you work. An AI backend watches your progress via periodic screenshots and advances the lesson when it detects you’ve done the right action.

## How it works

- **Overlay guidance**: A small translucent React window sits on top of your desktop with a short step description.
- **Your actions**: You use the target software normally (e.g., Figma, VS Code, etc.).
- **AI feedback loop**: The Electron app captures periodic screenshots and sends them to a Flask backend.
- **Agent judgment**: The backend’s learning agent compares the screenshot to the step’s finish criteria. If completed, it advances the lesson and pushes the next step to the overlay via WebSocket.

- **Plan-on-request**: From the main UI textbox, type what you want to learn (e.g., “I want to learn Figma”). The app generates a structured lesson plan and step-by-step finish criteria, then the overlay walks you through it.

## Quickstart (hackathon demo)

Prereqs: Node 18+, Python 3.10+, macOS recommended (uses a macOS mouse hook package).

1. Install root dependencies and build native hook:

```bash
npm install
```

2. Set up Python deps:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

3. Run everything in dev:

```bash
npm run dev
```

- Frontend at http://localhost:3000
- Overlay dev server at http://localhost:3001 (loaded by Electron overlay)
- Backend at http://127.0.0.1:5000 (HTTP + Socket.IO)
- Electron launches and shows the main UI

4. Open the overlay and start the loop:

- In the main UI, click “Start” to open the overlay window.
- The overlay will call `POST /api/start-step` to show the first step.
- Every ~10s a screenshot is sent to `POST /screenshot` for completion checks.
- When the agent says “YES”, the backend advances to the next step and broadcasts a new popup.

5. Generate a lesson plan (optional):

- In the main UI (bottom textbox), type your goal, e.g., “I want to learn Figma”, then click the → button.
- This calls the lesson-plan endpoint to create a course (lessons + steps + finish criteria) and store it (Supabase).
- Then click “Start” to open the overlay and follow the steps.

## Architecture

- **Electron (main process)**: `main.js`
  - Creates the main app window and the frameless, translucent overlay window.
  - Exposes screenshot capture via `desktopCapturer` through `preload.js`.
- **Overlay React app**: `overlay-screen/`
  - UI: `OverlayScreen.js` subscribes to Socket.IO messages and displays step text.
  - Services: `apiService.js` (`startStep`, `sendScreenshot`), `webSocket.js` (Socket.IO client), `screenshotService.js` (invokes Electron screenshot API).
- **Frontend (marketing/demo UI)**: `frontend/`
  - `pages/Home.js` includes a “Start” button that asks Electron to open the overlay.
  - `pages/Home.js` shows a bottom textbox where users can type requests (e.g., “I want to learn Figma”) to generate a lesson plan.
- **Backend (Flask + Socket.IO)**: `backend/`
  - `app.py` exposes `POST /api/start-step`, `POST /screenshot`, and broadcasts `popup_message` over Socket.IO.
  - `utils/learning_agent.py` manages lesson state, generates popup text from step descriptions, and decides completion using an LLM (via `letta-client`).
  - `utils/database_context.py` abstracts lesson steps and finish criteria (Supabase-backed in production, cached in-memory here).

## Key endpoints

- `POST /api/start-step` — initialize current step and push popup to overlay.
- `POST /screenshot` — stateless or progression-aware check; returns whether the step is completed and when to advance.
- `POST /api/generate-lesson-plan` — body: { "topic": "figma" } → scrapes sources, generates a multi-lesson plan with steps and finish criteria, uploads to Supabase, and returns the plan.
- `GET /api/lessons` — returns all lessons with their steps.
- Socket.IO event `popup_message` — backend → overlay step updates.

## What’s included

- Electron app with overlay window, screenshot capture, and mac mouse hook integration.
- React overlay that subscribes to WebSocket updates and drives the guidance UI.
- Flask backend with Socket.IO, simple lesson state, and AI-driven completion checks.

## Notes

- Built at CalHacks 12.0 as a functional prototype.
- The agent uses `letta-client` (OpenAI GPT-4o) to judge completion and can be swapped.
- Supabase integration is scaffolded; during the hackathon, lesson data can be cached/in-memory.

## Collaborators

- [@FabianSiswanto](https://github.com/FabianSiswanto)
- [@camero1993](https://github.com/camero1993)
- [@dewgong5](https://github.com/dewgong5)

License: MIT
