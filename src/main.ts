import "./styles.css";
import {
  ACESFilmicToneMapping,
  Clock,
  Euler,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { Ocean, createDefaultOceanOptions, type OceanSettings } from "./lib";
import { OceanSky } from "./lib/sky";
import { createOceanGui } from "./ui/createOceanGui";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    sampleOceanHeight: (x: number, z: number, atTimeSec?: number) => number;
    setOceanServerTime: (timeSec: number) => void;
    __oceanDebug: {
      setCameraPosition: (x: number, y: number, z: number) => void;
      setFollowMode: (snapEveryFrame: boolean, followSnap?: number) => void;
      stepFrame: (ms: number) => void;
      getFollowState: () => {
        camera: { x: number; y: number; z: number };
        oceanCenter: { x: number; z: number };
        followSnap: number;
        snapEveryFrame: boolean;
      };
    };
  }
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}
const cameraReadout = document.querySelector<HTMLParagraphElement>("#camera-readout");

const settings: OceanSettings = createDefaultOceanOptions();

const scene = new Scene();

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
camera.position.set(0, 8, 26);
camera.lookAt(0, 1.8, 0);

const renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

const ocean = new Ocean(settings);
scene.add(ocean.object3d);
const skyDome = new OceanSky();
scene.add(skyDome.object3d);

const gui = createOceanGui({
  settings,
  onRebuildGeometry: () => {
    ocean.setOptions(settings);
  }
});

const clock = new Clock();
let simTimeSec = 0.0;
const tempSunDir = new Vector3();
const tempCameraXz = new Vector2();
const tempLookDirection = new Vector3();
const tempMoveDirection = new Vector3();
const tempStrafeDirection = new Vector3();
const tempVelocity = new Vector3();

const flyConfig = {
  moveSpeed: 24.0,
  sprintMultiplier: 2.4,
  lookSensitivity: 0.0022,
  maxPitch: Math.PI * 0.495
};

const inputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  ascend: false,
  descend: false,
  sprint: false
};

let isPointerLocked = false;
const startEuler = new Euler().setFromQuaternion(camera.quaternion, "YXZ");
let yaw = startEuler.y;
let pitch = startEuler.x;

function applyCameraLook(): void {
  camera.rotation.order = "YXZ";
  camera.rotation.set(pitch, yaw, 0);
}

function clearInputState(): void {
  inputState.forward = false;
  inputState.backward = false;
  inputState.left = false;
  inputState.right = false;
  inputState.ascend = false;
  inputState.descend = false;
  inputState.sprint = false;
}

function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target) {
    return false;
  }
  if (target.isContentEditable) {
    return true;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function updateFlyMovement(dtSec: number): void {
  tempVelocity.set(0, 0, 0);

  if (inputState.forward || inputState.backward) {
    tempMoveDirection.set(0, 0, -1).applyQuaternion(camera.quaternion);
    if (inputState.backward) {
      tempMoveDirection.multiplyScalar(-1);
    }
    tempVelocity.add(tempMoveDirection);
  }

  if (inputState.right || inputState.left) {
    tempStrafeDirection.set(1, 0, 0).applyQuaternion(camera.quaternion);
    if (inputState.left) {
      tempStrafeDirection.multiplyScalar(-1);
    }
    tempVelocity.add(tempStrafeDirection);
  }

  if (inputState.ascend) {
    tempVelocity.y += 1;
  }
  if (inputState.descend) {
    tempVelocity.y -= 1;
  }

  if (tempVelocity.lengthSq() > 0) {
    tempVelocity.normalize();
    const speed =
      flyConfig.moveSpeed * (inputState.sprint ? flyConfig.sprintMultiplier : 1.0);
    camera.position.addScaledVector(tempVelocity, dtSec * speed);
  }
}

function requestMouseLook(): void {
  if (document.pointerLockElement !== renderer.domElement) {
    renderer.domElement.requestPointerLock();
  }
}

function updateSimulation(dtSec: number, forceAdvance = false): void {
  updateFlyMovement(dtSec);

  if (settings.useServerTime) {
    if (!settings.paused || forceAdvance) {
      settings.serverTimeSec += dtSec * settings.simulationSpeed;
    }
    simTimeSec = settings.serverTimeSec;
  } else if (!settings.paused || forceAdvance) {
    simTimeSec += dtSec * settings.simulationSpeed;
  }

  ocean.setOptions(settings);
  ocean.update({ camera, timeSec: simTimeSec });
  ocean.getSunDirection(tempSunDir);
  skyDome.setOptions({
    skyHorizonColor: settings.skyHorizonColor,
    skyZenithColor: settings.skyZenithColor,
    sunIntensity: settings.sunIntensity,
    sunGlowPower: settings.sunGlowPower,
    sunGlowIntensity: settings.sunGlowIntensity,
    skyStrength: settings.skyStrength,
    toneMapExposure: settings.toneMapExposure
  });
  skyDome.update(camera, tempSunDir);
}

function render(): void {
  if (cameraReadout) {
    cameraReadout.textContent = `Camera: x ${camera.position.x.toFixed(2)} | y ${camera.position.y.toFixed(
      2
    )} | z ${camera.position.z.toFixed(2)}`;
  }
  renderer.render(scene, camera);
}

function animate(): void {
  const dtSec = Math.min(clock.getDelta(), 1 / 20);
  updateSimulation(dtSec);
  render();
  requestAnimationFrame(animate);
}

function onResize(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      // Ignore browser policy rejections.
    });
  } else {
    document.exitFullscreen().catch(() => {
      // Ignore browser policy rejections.
    });
  }
}

window.addEventListener("resize", onResize);
window.addEventListener("keydown", (event) => {
  if (isTypingTarget(event)) {
    return;
  }

  switch (event.code) {
    case "KeyW":
      inputState.forward = true;
      event.preventDefault();
      break;
    case "KeyS":
      inputState.backward = true;
      event.preventDefault();
      break;
    case "KeyA":
      inputState.left = true;
      event.preventDefault();
      break;
    case "KeyD":
      inputState.right = true;
      event.preventDefault();
      break;
    case "Space":
      inputState.ascend = true;
      event.preventDefault();
      break;
    case "ControlLeft":
    case "ControlRight":
    case "KeyC":
      inputState.descend = true;
      event.preventDefault();
      break;
    case "ShiftLeft":
    case "ShiftRight":
      inputState.sprint = true;
      event.preventDefault();
      break;
    default:
      break;
  }

  if (event.key.toLowerCase() === "f") {
    toggleFullscreen();
  }
});
window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyW":
      inputState.forward = false;
      break;
    case "KeyS":
      inputState.backward = false;
      break;
    case "KeyA":
      inputState.left = false;
      break;
    case "KeyD":
      inputState.right = false;
      break;
    case "Space":
      inputState.ascend = false;
      break;
    case "ControlLeft":
    case "ControlRight":
    case "KeyC":
      inputState.descend = false;
      break;
    case "ShiftLeft":
    case "ShiftRight":
      inputState.sprint = false;
      break;
    default:
      break;
  }
});
window.addEventListener("blur", clearInputState);
document.addEventListener("fullscreenchange", onResize);
document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});
document.addEventListener("mousemove", (event) => {
  if (!isPointerLocked) {
    return;
  }

  yaw -= event.movementX * flyConfig.lookSensitivity;
  pitch -= event.movementY * flyConfig.lookSensitivity;
  pitch = Math.max(-flyConfig.maxPitch, Math.min(flyConfig.maxPitch, pitch));
  applyCameraLook();
});
renderer.domElement.addEventListener("click", requestMouseLook);
renderer.domElement.addEventListener("contextmenu", (event) => event.preventDefault());

window.sampleOceanHeight = (x: number, z: number, atTimeSec?: number): number => {
  return ocean.sampleHeight(x, z, atTimeSec ?? simTimeSec);
};

window.setOceanServerTime = (timeSec: number): void => {
  settings.useServerTime = true;
  settings.serverTimeSec = timeSec;
  simTimeSec = timeSec;
};

window.__oceanDebug = {
  setCameraPosition: (x: number, y: number, z: number): void => {
    camera.position.set(x, y, z);
    updateSimulation(0, true);
    render();
  },
  setFollowMode: (snapEveryFrame: boolean, followSnap?: number): void => {
    settings.followCameraEveryFrame = snapEveryFrame;
    if (typeof followSnap === "number" && Number.isFinite(followSnap)) {
      settings.followSnap = Math.max(0.001, followSnap);
    }
    updateSimulation(0, true);
    render();
  },
  stepFrame: (ms: number): void => {
    window.advanceTime(ms);
  },
  getFollowState: () => ({
    camera: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    },
    oceanCenter: ocean.getCenterXZ(),
    followSnap: settings.followSnap,
    snapEveryFrame: settings.followCameraEveryFrame
  })
};

window.advanceTime = (ms: number): void => {
  const totalSteps = Math.max(1, Math.round(ms / (1000 / 60)));
  const dtSec = ms / 1000 / totalSteps;
  for (let i = 0; i < totalSteps; i += 1) {
    updateSimulation(dtSec, true);
  }
  render();
};

window.render_game_to_text = (): string => {
  tempCameraXz.set(camera.position.x, camera.position.z);
  tempLookDirection.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();

  const samplePoints = [
    { x: tempCameraXz.x, z: tempCameraXz.y },
    { x: tempCameraXz.x + 15, z: tempCameraXz.y },
    { x: tempCameraXz.x, z: tempCameraXz.y + 15 },
    { x: tempCameraXz.x - 15, z: tempCameraXz.y }
  ];

  return JSON.stringify({
    mode: "ocean_testbed",
    coordinate_system: "World origin at (0,0,0). +X right/east, +Y up, +Z forward/south.",
    camera: {
      position: {
        x: Number(camera.position.x.toFixed(3)),
        y: Number(camera.position.y.toFixed(3)),
        z: Number(camera.position.z.toFixed(3))
      },
      lookDirection: {
        x: Number(tempLookDirection.x.toFixed(4)),
        y: Number(tempLookDirection.y.toFixed(4)),
        z: Number(tempLookDirection.z.toFixed(4))
      }
    },
    ocean: {
      timeSec: Number(simTimeSec.toFixed(4)),
      serverTimeMode: settings.useServerTime,
      displacementOctaves: settings.displacementOctaves,
      normalOctaves: settings.normalOctaves,
      ringCount: settings.ringCount,
      followSnap: settings.followSnap,
      snapEveryFrame: settings.followCameraEveryFrame,
      center: ocean.getCenterXZ(),
      maxRadius: Number(ocean.getMaxRadius().toFixed(2)),
      sunDirection: {
        x: Number(tempSunDir.x.toFixed(4)),
        y: Number(tempSunDir.y.toFixed(4)),
        z: Number(tempSunDir.z.toFixed(4))
      },
      sampleHeights: samplePoints.map((point) => ({
        x: Number(point.x.toFixed(2)),
        z: Number(point.z.toFixed(2)),
        y: Number(ocean.sampleHeight(point.x, point.z).toFixed(4))
      }))
    },
    debug: {
      wireframe: settings.wireframe,
      debugView: settings.debugView,
      paused: settings.paused,
      pointerLocked: isPointerLocked
    }
  });
};

onResize();
applyCameraLook();
updateSimulation(0);
render();
animate();

void gui;
