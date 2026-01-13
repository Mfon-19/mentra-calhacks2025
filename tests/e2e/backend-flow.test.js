/**
 * @jest-environment node
 */

const path = jest.requireActual("path");

const BACKEND_URL = "http://127.0.0.1:5000";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(url, attempts = 40, waitMs = 500) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        return;
      }
    } catch (error) {
      // Retry until healthy
    }
    await delay(waitMs);
  }

  throw new Error("Backend failed to become healthy.");
}

describe("Backend E2E flow", () => {
  let backendProcess;

  beforeAll(async () => {
    if (global.__realFetch) {
      global.fetch = global.__realFetch;
    }

    const { spawn } = jest.requireActual("child_process");
    backendProcess = spawn("python3", ["backend/app.py"], {
      cwd: path.join(__dirname, "../.."),
      env: {
        ...process.env,
        LETTA_API_KEY: "",
        PYTHONUNBUFFERED: "1",
      },
      stdio: "pipe",
    });

    await waitForHealth(BACKEND_URL);
  }, 60000);

  afterAll(() => {
    if (backendProcess) {
      backendProcess.kill();
    }
  });

  test("health endpoint responds", async () => {
    const response = await fetch(`${BACKEND_URL}/health`);
    expect(response.ok).toBe(true);
    const payload = await response.json();
    expect(payload.status).toBe("healthy");
  });

  test("start-step initializes the first step from local course data", async () => {
    const response = await fetch(`${BACKEND_URL}/api/start-step`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.ok).toBe(true);
    const payload = await response.json();
    expect(payload.status).toBe("success");
    expect(payload.step_order).toBe(1);
  });

  test("stateless screenshot analysis returns a completion result", async () => {
    const response = await fetch(`${BACKEND_URL}/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: "Zm9v",
        finish_criteria: "Dummy criteria",
        stateless: true,
      }),
    });

    expect(response.ok).toBe(true);
    const payload = await response.json();
    expect(payload.status).toBe("success");
    expect(payload.completed).toBe(false);
  });
});
