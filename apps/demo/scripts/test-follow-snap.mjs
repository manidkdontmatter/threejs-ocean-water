import { spawn, spawnSync } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const HOST = "127.0.0.1";
const EPSILON = 1e-6;
const SERVER_REQUEST_TIMEOUT_MS = 1200;
const SERVER_SHUTDOWN_TIMEOUT_MS = 5000;
const TEST_TIMEOUT_MS = 120000;

function nearlyEqual(a, b, epsilon = EPSILON) {
  return Math.abs(a - b) <= epsilon;
}

function assertNear(actual, expected, label) {
  if (!nearlyEqual(actual, expected)) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", () => resolve());
  });
}

async function shutdownServer(server) {
  if (server.exitCode !== null || server.killed) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    server.kill("SIGTERM");
  }

  await Promise.race([onceExit(server), wait(SERVER_SHUTDOWN_TIMEOUT_MS)]);
}

async function waitForServerReady(url, timeoutMs = 30000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(SERVER_REQUEST_TIMEOUT_MS) });
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

function runStepBanner(label) {
  console.log(`\n[follow-snap-test] ${label}`);
}

async function runFollowSnapAssertions(page) {
  const readState = async () =>
    page.evaluate(() => {
      return window.__oceanDebug.getFollowState();
    });

  const runCase = async ({ label, snapEveryFrame, followSnap, camera, expectedCenter }) => {
    runStepBanner(label);
    await page.evaluate(
      ({ snapEveryFrame, followSnap, camera }) => {
        window.__oceanDebug.setFollowMode(snapEveryFrame, followSnap);
        window.__oceanDebug.setCameraPosition(camera.x, camera.y, camera.z);
        window.__oceanDebug.stepFrame(16.667);
      },
      { snapEveryFrame, followSnap, camera }
    );

    const state = await readState();
    assertNear(state.oceanCenter.x, expectedCenter.x, `${label} center.x`);
    assertNear(state.oceanCenter.z, expectedCenter.z, `${label} center.z`);
    console.log(
      `[pass] ${label}: camera=(${state.camera.x.toFixed(3)}, ${state.camera.z.toFixed(
        3
      )}) center=(${state.oceanCenter.x.toFixed(3)}, ${state.oceanCenter.z.toFixed(3)})`
    );
  };

  await runCase({
    label: "grid snap (followSnap=10) near spawn",
    snapEveryFrame: false,
    followSnap: 10,
    camera: { x: 12.3, y: 8.0, z: 27.9 },
    expectedCenter: { x: 10.0, z: 30.0 }
  });

  await runCase({
    label: "grid snap (followSnap=10) moved camera",
    snapEveryFrame: false,
    followSnap: 10,
    camera: { x: 16.4, y: 8.0, z: 32.2 },
    expectedCenter: { x: 20.0, z: 30.0 }
  });

  await runCase({
    label: "grid snap (followSnap=1) large coordinates",
    snapEveryFrame: false,
    followSnap: 1,
    camera: { x: 12345.678, y: 8.0, z: -9876.543 },
    expectedCenter: { x: 12346.0, z: -9877.0 }
  });

  await runCase({
    label: "per-frame follow mode ignores snap grid",
    snapEveryFrame: true,
    followSnap: 20,
    camera: { x: 12345.678, y: 8.0, z: -9876.543 },
    expectedCenter: { x: 12345.678, z: -9876.543 }
  });
}

async function main() {
  const port = 5200 + Math.floor(Math.random() * 1000);
  const url = `http://${HOST}:${port}`;
  const command =
    process.platform === "win32"
      ? {
          bin: "cmd.exe",
          args: ["/c", `npm run dev -- --host ${HOST} --port ${port} --strictPort`]
        }
      : {
          bin: "npm",
          args: ["run", "dev", "--", "--host", HOST, "--port", String(port), "--strictPort"]
        };

  const server = spawn(command.bin, command.args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });
  server.on("error", (error) => {
    console.error("[follow-snap-test] dev server spawn error:", error);
  });

  server.stdout.on("data", (chunk) => {
    process.stdout.write(`[dev] ${chunk}`);
  });
  server.stderr.on("data", (chunk) => {
    process.stderr.write(`[dev:err] ${chunk}`);
  });

  let browser = null;
  try {
    await waitForServerReady(url);
    runStepBanner(`server ready at ${url}`);

    browser = await chromium.launch({
      headless: true,
      args: ["--use-gl=angle", "--use-angle=swiftshader"]
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__oceanDebug), null, { timeout: 15000 });

    await runFollowSnapAssertions(page);
    console.log("\n[follow-snap-test] all assertions passed");
  } finally {
    if (browser) {
      await browser.close();
    }
    await shutdownServer(server);
  }
}

withTimeout(main(), TEST_TIMEOUT_MS, "follow-snap test run").catch((error) => {
  console.error("\n[follow-snap-test] FAILED");
  console.error(error);
  process.exit(1);
});
