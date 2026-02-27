import "./styles.css";
import GUI from "lil-gui";
import RAPIER from "@dimforge/rapier3d-compat";
import {
  ACESFilmicToneMapping,
  BoxGeometry,
  Clock,
  Color,
  DirectionalLight,
  Euler,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";
import { Ocean, createDefaultOceanOptions, type OceanSettings } from "web-ocean-water";
import { OceanSky } from "web-ocean-water/sky";
import { applyBuoyancyToRigidBody, createBoxBuoyancyProbes } from "web-ocean-water/rapier";
import { createOceanGui, type OceanTimeControls } from "./ui/createOceanGui";

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

interface FloatingBody {
  name: string;
  dimensions: { x: number; y: number; z: number };
  density: number;
  buoyancyScale: number;
  rigidBody: RAPIER.RigidBody;
  mesh: Mesh<BoxGeometry, MeshStandardMaterial>;
  probes: ReturnType<typeof createBoxBuoyancyProbes>;
  buoyancyVolume: number;
  spawn: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
  };
  submergedFraction: number;
}

await RAPIER.init();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("Missing #app root");
}
const cameraReadout = document.querySelector<HTMLParagraphElement>("#camera-readout");

const settings: OceanSettings = createDefaultOceanOptions();
const timeControls: OceanTimeControls = {
  simulationSpeed: 1.0,
  paused: false,
  useServerTime: false,
  serverTimeSec: 0.0
};

const scene = new Scene();
scene.background = new Color("#95b9d6");

const camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 12000);
camera.position.set(0, 8, 26);
camera.lookAt(0, 1.8, 0);

const renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
app.appendChild(renderer.domElement);

const keyLight = new DirectionalLight("#fff7dd", 1.35);
keyLight.position.set(34, 58, 16);
scene.add(keyLight);
scene.add(new HemisphereLight("#bfe4ff", "#4f5f73", 0.58));

const ocean = new Ocean(settings);
scene.add(ocean.object3d);
const skyDome = new OceanSky();
scene.add(skyDome.object3d);

const gui = createOceanGui({
  settings,
  timeControls,
  onRebuildGeometry: () => {
    ocean.setOptions(settings);
  },
  onSettingsChanged: () => {
    ocean.setOptions(settings);
  }
});

const floatingUiState = {
  fluidDensity: 1.0,
  buoyancyScale: 1.0,
  linearDrag: 3.2,
  angularDrag: 1.8,
  normalAlign: 0.0,
  maxSubmergenceScale: 1.0,
  probeSubdivisions: 2,
  resetBodies: () => {
    for (const body of floatingBodies) {
      body.rigidBody.setTranslation(body.spawn.position, true);
      body.rigidBody.setRotation(body.spawn.rotation, true);
      body.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
      body.rigidBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
      body.submergedFraction = 0;
    }
    syncFloatingMeshes();
  }
};

const floatingGui = new GUI({ title: "Floating Bodies", width: 300 });
floatingGui
  .add(floatingUiState, "fluidDensity", 0.2, 2.0, 0.001)
  .name("fluidDensity");
floatingGui
  .add(floatingUiState, "buoyancyScale", 0.2, 2.4, 0.001)
  .name("buoyancyScale");
floatingGui
  .add(floatingUiState, "linearDrag", 0.0, 10.0, 0.001)
  .name("linearDrag");
floatingGui
  .add(floatingUiState, "angularDrag", 0.0, 8.0, 0.001)
  .name("angularDrag");
floatingGui
  .add(floatingUiState, "normalAlign", 0.0, 1.0, 0.001)
  .name("normalAlign");
floatingGui
  .add(floatingUiState, "maxSubmergenceScale", 0.25, 1.2, 0.001)
  .name("submergenceScale");
const probesController = floatingGui
  .add(floatingUiState, "probeSubdivisions", 1, 4, 1)
  .name("probeSubdivisions");
floatingGui.add(floatingUiState, "resetBodies").name("reset");

const clock = new Clock();
let simTimeSec = 0.0;
const tempSunDir = new Vector3();
const tempCameraXz = new Vector2();
const tempLookDirection = new Vector3();
const tempMoveDirection = new Vector3();
const tempStrafeDirection = new Vector3();
const tempVelocity = new Vector3();
const tempQuaternion = new Quaternion();

const physicsStepSec = 1 / 60;
const maxPhysicsSteps = 10;
let physicsAccumulatorSec = 0;
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.integrationParameters.dt = physicsStepSec;

const floatingBodies: FloatingBody[] = [];

function makeFloatingBody(config: {
  name: string;
  dimensions: { x: number; y: number; z: number };
  density: number;
  buoyancyScale: number;
  color: string;
  position: { x: number; y: number; z: number };
  yawDeg?: number;
}): FloatingBody {
  const { dimensions } = config;
  const half = {
    x: dimensions.x * 0.5,
    y: dimensions.y * 0.5,
    z: dimensions.z * 0.5
  };
  const yaw = ((config.yawDeg ?? 0) * Math.PI) / 180;
  const spawnRotation = {
    x: 0,
    y: Math.sin(yaw * 0.5),
    z: 0,
    w: Math.cos(yaw * 0.5)
  };

  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(config.position.x, config.position.y, config.position.z)
    .setRotation(spawnRotation)
    .setCanSleep(false)
    .setGravityScale(1.0)
    .setLinearDamping(0.15)
    .setAngularDamping(0.2);
  const rigidBody = world.createRigidBody(bodyDesc);

  const colliderDesc = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z)
    .setDensity(config.density)
    .setFriction(0.2)
    .setRestitution(0.0);
  world.createCollider(colliderDesc, rigidBody);

  const geometry = new BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
  const material = new MeshStandardMaterial({ color: config.color, roughness: 0.58, metalness: 0.08 });
  const mesh = new Mesh(geometry, material);
  mesh.name = config.name;
  scene.add(mesh);

  const body: FloatingBody = {
    name: config.name,
    dimensions,
    density: config.density,
    buoyancyScale: config.buoyancyScale,
    rigidBody,
    mesh,
    probes: createBoxBuoyancyProbes(
      dimensions.x,
      dimensions.y,
      dimensions.z,
      floatingUiState.probeSubdivisions
    ),
    buoyancyVolume: dimensions.x * dimensions.y * dimensions.z,
    spawn: {
      position: { ...config.position },
      rotation: { ...spawnRotation }
    },
    submergedFraction: 0
  };

  return body;
}

function rebuildProbes(): void {
  for (const body of floatingBodies) {
    body.probes = createBoxBuoyancyProbes(
      body.dimensions.x,
      body.dimensions.y,
      body.dimensions.z,
      floatingUiState.probeSubdivisions
    );
  }
}

probesController.onFinishChange(rebuildProbes);

floatingBodies.push(
  makeFloatingBody({
    name: "Cube",
    dimensions: { x: 2.0, y: 2.0, z: 2.0 },
    density: 0.92,
    buoyancyScale: 1.0,
    color: "#f5c257",
    position: { x: -9.0, y: 3.7, z: -4.0 }
  }),
  makeFloatingBody({
    name: "TallNarrow",
    dimensions: { x: 1.05, y: 4.2, z: 1.05 },
    density: 1.08,
    buoyancyScale: 1.0,
    color: "#6ad6a2",
    position: { x: 0.0, y: 5.2, z: -4.0 },
    yawDeg: 18
  }),
  makeFloatingBody({
    name: "WideShort",
    dimensions: { x: 4.4, y: 0.85, z: 4.4 },
    density: 0.78,
    buoyancyScale: 1.0,
    color: "#79baf3",
    position: { x: 9.0, y: 3.2, z: -4.0 },
    yawDeg: -10
  })
);

function syncFloatingMeshes(): void {
  for (const body of floatingBodies) {
    const position = body.rigidBody.translation();
    const rotation = body.rigidBody.rotation();
    body.mesh.position.set(position.x, position.y, position.z);
    tempQuaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
    body.mesh.quaternion.copy(tempQuaternion);
  }
}

syncFloatingMeshes();

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

function advanceClock(dtSec: number, forceAdvance: boolean): number {
  if (timeControls.useServerTime) {
    if (forceAdvance || !timeControls.paused) {
      timeControls.serverTimeSec += dtSec * timeControls.simulationSpeed;
    }
    simTimeSec = timeControls.serverTimeSec;
    return forceAdvance || !timeControls.paused ? dtSec * timeControls.simulationSpeed : 0;
  }

  if (forceAdvance || !timeControls.paused) {
    simTimeSec += dtSec * timeControls.simulationSpeed;
    return dtSec * timeControls.simulationSpeed;
  }

  return 0;
}

function stepBuoyancyAndPhysics(stepDtSec: number): void {
  const waveParams = ocean.getWaveSamplingParams();

  for (const body of floatingBodies) {
    const stats = applyBuoyancyToRigidBody(
      body.rigidBody,
      body.probes,
      waveParams,
      simTimeSec,
      stepDtSec,
      {
        fluidDensity: floatingUiState.fluidDensity,
        buoyancyScale: floatingUiState.buoyancyScale * body.buoyancyScale,
        linearDrag: floatingUiState.linearDrag,
        angularDrag: floatingUiState.angularDrag,
        normalAlign: floatingUiState.normalAlign,
        maxSubmergenceDepth: body.dimensions.y * floatingUiState.maxSubmergenceScale,
        volume: body.buoyancyVolume
      }
    );
    body.submergedFraction = stats.submergedFraction;
  }

  world.step();
  syncFloatingMeshes();
}

function runFixedPhysics(dtSec: number): void {
  if (dtSec <= 0) {
    return;
  }

  physicsAccumulatorSec = Math.min(physicsAccumulatorSec + dtSec, physicsStepSec * maxPhysicsSteps);

  let stepCount = 0;
  while (physicsAccumulatorSec >= physicsStepSec && stepCount < maxPhysicsSteps) {
    stepBuoyancyAndPhysics(physicsStepSec);
    physicsAccumulatorSec -= physicsStepSec;
    stepCount += 1;
  }
}

function updateSimulation(dtSec: number, forceAdvance = false): void {
  updateFlyMovement(dtSec);

  const advancedDtSec = advanceClock(dtSec, forceAdvance);
  runFixedPhysics(advancedDtSec);

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
  timeControls.useServerTime = true;
  timeControls.serverTimeSec = timeSec;
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
    ocean.setOptions(settings);
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
      serverTimeMode: timeControls.useServerTime,
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
    floatingBodies: floatingBodies.map((body) => ({
      name: body.name,
      dimensions: body.dimensions,
      position: {
        x: Number(body.mesh.position.x.toFixed(3)),
        y: Number(body.mesh.position.y.toFixed(3)),
        z: Number(body.mesh.position.z.toFixed(3))
      },
      rotation: {
        x: Number(body.mesh.quaternion.x.toFixed(4)),
        y: Number(body.mesh.quaternion.y.toFixed(4)),
        z: Number(body.mesh.quaternion.z.toFixed(4)),
        w: Number(body.mesh.quaternion.w.toFixed(4))
      },
      submergedFraction: Number(body.submergedFraction.toFixed(4)),
      density: body.density,
      buoyancyScale: body.buoyancyScale,
      probeCount: body.probes.length
    })),
    debug: {
      wireframe: settings.wireframe,
      debugView: settings.debugView,
      paused: timeControls.paused,
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
void floatingGui;
