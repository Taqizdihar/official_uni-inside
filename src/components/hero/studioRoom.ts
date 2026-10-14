import * as THREE from 'three';
import type { RoomAnimation, RoomBuilderContext } from './roomGeometry';

export function buildStudioRoom(context: RoomBuilderContext): RoomAnimation {
  const { room, static: fixed, materials, resources, batch, register } = context;

  // A clear editing station is the visual center; equipment occupies its edges.
  fixed.box('charcoal', [2.85, 0.12, 0.82], [0, 0.87, 0.88]);
  fixed.box('yellow', [2.85, 0.025, 0.045], [0, 0.92, 1.28]);
  for (const x of [-1.17, 1.17]) {
    fixed.box('metal', [0.085, 0.82, 0.6], [x, 0.42, 0.86]);
    fixed.box('black', [0.34, 0.4, 0.33], [x, 1.12, 0.82]);
    for (const y of [1.05, 1.22]) fixed.cylinder('metal', 0.085, 0.028, [x, y, 1], [Math.PI / 2, 0, 0]);
    fixed.box('yellow', [0.045, 0.015, 0.025], [x, 0.98, 1.01]);
  }
  fixed.box('black', [1.26, 0.72, 0.085], [0, 1.35, 0.82]);
  fixed.box('metal', [0.085, 0.22, 0.085], [0, 1.02, 0.83]);
  fixed.box('black', [0.38, 0.025, 0.2], [0, 0.95, 0.9]);
  fixed.box('black', [0.92, 0.035, 0.23], [-0.12, 0.95, 1.13]);
  for (let row = 0; row < 3; row++) for (let key = 0; key < 10; key++) {
    fixed.box('ivory', [0.064, 0.012, 0.044], [-0.48 + key * 0.08, 0.975, 1.055 + row * 0.06]);
  }
  fixed.box('metal', [0.12, 0.036, 0.17], [0.55, 0.955, 1.14]);
  fixed.box('charcoal', [0.63, 0.09, 0.63], [0.25, 0.49, 1.88]);
  fixed.box('charcoal', [0.64, 0.68, 0.1], [0.25, 0.86, 2.13], [-0.13, 0, 0]);
  fixed.cylinder('metal', 0.065, 0.37, [0.25, 0.28, 1.88]);
  for (let index = 0; index < 5; index++) {
    const angle = index * Math.PI * 2 / 5;
    const x = 0.25 + Math.cos(angle) * 0.38;
    const z = 1.88 + Math.sin(angle) * 0.38;
    fixed.beam('black', [0.25, 0.13, 1.88], [x, 0.08, z], 0.045);
    fixed.cylinder('black', 0.062, 0.045, [x, 0.075, z], [0, 0, Math.PI / 2], 0.062, 6);
  }
  for (const x of [-0.12, 0.62]) {
    fixed.beam('metal', [x, 0.5, 1.85], [x, 0.71, 1.85], 0.035);
    fixed.box('black', [0.09, 0.035, 0.35], [x, 0.72, 1.89]);
  }

  const editing = new THREE.Group();
  editing.name = 'hotspot-editing';
  editing.position.set(0, 1.35, 0.87);
  room.add(editing);
  const display = batch();
  display.box('screen', [1.11, 0.57, 0.014], [0, 0, 0]);
  const screenMeshes = display.compile(editing, 'editing-screen');
  // Interface, preview window and staggered timeline tracks are geometry, not images.
  fixed.box('black', [0.48, 0.28, 0.014], [-0.18, 1.46, 0.886]);
  fixed.box('sage', [0.27, 0.18, 0.018], [-0.2, 1.46, 0.897]);
  for (let row = 0; row < 4; row++) {
    fixed.box(row % 2 ? 'yellow' : 'ivory', [0.65 - row * 0.08, 0.025, 0.015], [-0.07 + row * 0.03, 1.17 + row * 0.04, 0.89]);
  }
  for (let row = 0; row < 5; row++) fixed.box('ivory', [0.2, 0.018, 0.014], [0.38, 1.33 + row * 0.05, 0.89]);
  const cursor = new THREE.Group();
  cursor.name = 'timeline-cursor';
  editing.add(cursor);
  const cursorShape = batch();
  cursorShape.box('yellow', [0.012, 0.22, 0.016], [-0.27, -0.15, 0.03]);
  cursorShape.compile(cursor, 'timeline-cursor');
  register('editing', editing, [0, 0.18, 0.04], screenMeshes);
  const screenColors = screenMeshes[0].geometry.getAttribute('color') as THREE.BufferAttribute;

  // Camera on a spread tripod, with a stepped lens and recognizable top handle.
  const camera = new THREE.Group();
  camera.name = 'hotspot-camera';
  camera.position.set(-1.82, 1.22, 2.76);
  camera.rotation.y = -0.15;
  room.add(camera);
  const cameraBody = batch();
  cameraBody.box('black', [0.43, 0.3, 0.28], [0, 0, 0]);
  cameraBody.box('black', [0.26, 0.055, 0.12], [0, 0.22, 0]);
  cameraBody.box('black', [0.045, 0.13, 0.06], [-0.09, 0.17, 0]);
  cameraBody.box('black', [0.045, 0.13, 0.06], [0.09, 0.17, 0]);
  cameraBody.cylinder('black', 0.13, 0.25, [0.055, 0, 0.2], [Math.PI / 2, 0, 0]);
  cameraBody.box('black', [0.08, 0.18, 0.26], [-0.24, -0.01, 0]);
  const cameraMeshes = cameraBody.compileColored(camera, 'camera');
  const lens = new THREE.Group();
  lens.name = 'camera-focus-ring';
  camera.add(lens);
  const lensShape = batch();
  lensShape.cylinder('yellow', 0.135, 0.035, [0.055, 0, 0.32], [Math.PI / 2, 0, 0]);
  cameraMeshes.push(...lensShape.compile(lens, 'camera-focus-ring'));
  fixed.cylinder('metal', 0.045, 0.67, [-1.82, 0.86, 2.76]);
  fixed.cylinder('black', 0.1, 0.12, [-1.82, 0.55, 2.76]);
  for (let index = 0; index < 3; index++) {
    const angle = index * Math.PI * 2 / 3;
    fixed.beam('metal', [-1.82, 0.67, 2.76], [-1.82 + Math.cos(angle) * 0.42, 0.04, 2.76 + Math.sin(angle) * 0.42], 0.055);
  }
  register('camera', camera, [0.055, 0.14, 0.25], cameraMeshes);

  fixed.box('charcoal', [1.03, 0.09, 0.73], [1.9, 0.7, 2.57]);
  for (const x of [1.5, 2.3]) fixed.box('metal', [0.055, 0.68, 0.6], [x, 0.35, 2.55]);
  const drone = new THREE.Group();
  drone.name = 'hotspot-drone';
  drone.position.set(1.9, 0.88, 2.55);
  room.add(drone);
  const droneBody = batch();
  droneBody.box('ivory', [0.3, 0.14, 0.4], [0, 0, 0]);
  droneBody.box('black', [0.13, 0.09, 0.1], [0, -0.04, 0.23]);
  droneBody.cylinder('black', 0.045, 0.045, [0, -0.04, 0.3], [Math.PI / 2, 0, 0]);
  const rotorPositions: [number, number, number][] = [];
  for (const x of [-0.31, 0.31]) for (const z of [-0.28, 0.28]) {
    droneBody.beam('ivory', [0, 0, 0], [x, 0.01, z], 0.065, 0.09);
    droneBody.cylinder('black', 0.05, 0.07, [x, 0.05, z]);
    rotorPositions.push([x, 0.11, z]);
  }
  const droneMeshes = droneBody.compileColored(drone, 'drone');
  const propGeometry = new THREE.BoxGeometry(0.4, 0.018, 0.046);
  const propColors = new Float32Array(propGeometry.getAttribute('position').count * 3).fill(1);
  propGeometry.setAttribute('color', new THREE.BufferAttribute(propColors, 3));
  resources.add(propGeometry);
  const propellers = new THREE.InstancedMesh(propGeometry, materials.black, 4);
  propellers.name = 'drone-propellers';
  drone.add(propellers);
  droneMeshes.push(propellers);
  const rotorTransform = new THREE.Object3D();
  register('drone', drone, [0, 0.15, 0.1], droneMeshes);

  const light = new THREE.Group();
  light.name = 'hotspot-lighting';
  light.position.set(-2.46, 1.78, 1.44);
  light.rotation.y = 0.42;
  room.add(light);
  const lightShape = batch();
  lightShape.box('black', [0.78, 0.59, 0.18], [0, 0, 0]);
  lightShape.box('ivory', [0.7, 0.51, 0.018], [0, 0, 0.1]);
  const lightMeshes = lightShape.compile(light, 'softbox');
  const panel = lightMeshes.find((mesh) => mesh.name.endsWith('ivory'))!;
  const panelColors = panel.geometry.getAttribute('color') as THREE.BufferAttribute;
  fixed.cylinder('metal', 0.035, 1.5, [-2.46, 0.82, 1.44]);
  for (let index = 0; index < 3; index++) {
    const angle = index * Math.PI * 2 / 3;
    fixed.beam('metal', [-2.46, 0.35, 1.44], [-2.46 + Math.cos(angle) * 0.35, 0.03, 1.44 + Math.sin(angle) * 0.35], 0.035);
  }
  register('lighting', light, [0.12, 0.13, 0.11], lightMeshes);

  fixed.cylinder('black', 0.17, 0.035, [-0.88, 0.97, 1.13]);
  fixed.beam('metal', [-0.88, 0.98, 1.13], [-0.88, 1.35, 1.13], 0.035);
  fixed.beam('metal', [-0.88, 1.35, 1.13], [-0.61, 1.5, 1.02], 0.026);
  const microphone = new THREE.Group();
  microphone.name = 'hotspot-microphone';
  microphone.position.set(-0.61, 1.49, 1.04);
  room.add(microphone);
  const micShape = batch();
  micShape.cylinder('black', 0.065, 0.27, [0, 0, 0], [0.35, 0, 0]);
  micShape.cylinder('black', 0.075, 0.095, [0, 0.13, 0.045], [0.35, 0, 0]);
  const micMeshes = micShape.compile(microphone, 'microphone');
  register('microphone', microphone, [0, 0.1, 0.08], micMeshes);

  // Sparse accessories keep the floor and the equipment silhouettes readable.
  fixed.box('charcoal', [0.69, 0.3, 0.38], [-2.58, 0.17, 2.08]);
  fixed.box('yellow', [0.1, 0.028, 0.05], [-2.58, 0.32, 2.28]);
  fixed.box('metal', [0.67, 0.065, 0.27], [2.68, 1.23, 1.2], [0, -Math.PI / 4, 0]);
  fixed.box('ivory', [0.2, 0.3, 0.16], [2.46, 1.4, 1.1], [0, -Math.PI / 4, 0]);
  fixed.box('yellow', [0.11, 0.23, 0.18], [2.66, 1.36, 1.2], [0, -Math.PI / 4, 0]);

  let lastRotorRotation = Number.NaN;
  let lastScreenLevel = Number.NaN;
  let lastPanelLevel = Number.NaN;
  return (activity, time, reducedMotion) => {
    const wave = reducedMotion ? 0 : Math.sin(time * 2.8);
    camera.rotation.y = -0.15 + activity.camera * wave * 0.07;
    camera.rotation.x = activity.camera * 0.045;
    lens.scale.setScalar(1 + activity.camera * (0.025 + wave * 0.013));
    drone.position.y = 0.88 + activity.drone * (0.17 + wave * 0.015);
    const rotorRotation = reducedMotion ? 0 : time * activity.drone * 14;
    if (rotorRotation !== lastRotorRotation) {
      for (let index = 0; index < rotorPositions.length; index++) {
        rotorTransform.position.set(...rotorPositions[index]);
        rotorTransform.rotation.y = rotorRotation + index * Math.PI / 2;
        rotorTransform.updateMatrix();
        propellers.setMatrixAt(index, rotorTransform.matrix);
      }
      propellers.instanceMatrix.needsUpdate = true;
      lastRotorRotation = rotorRotation;
    }
    cursor.position.x = activity.editing * (reducedMotion ? 0.16 : (Math.sin(time * 1.9) + 1) * 0.23);
    const screenLevel = 0.83 + activity.editing * 0.17;
    if (screenLevel !== lastScreenLevel) {
      (screenColors.array as Float32Array).fill(screenLevel);
      screenColors.needsUpdate = true;
      lastScreenLevel = screenLevel;
    }
    light.rotation.x = activity.lighting * wave * 0.022;
    const panelLevel = 0.83 + activity.lighting * (0.14 + (wave + 1) * 0.015);
    if (panelLevel !== lastPanelLevel) {
      (panelColors.array as Float32Array).fill(panelLevel);
      panelColors.needsUpdate = true;
      lastPanelLevel = panelLevel;
    }
    microphone.rotation.z = activity.microphone * (0.035 + wave * 0.025);
  };
}
