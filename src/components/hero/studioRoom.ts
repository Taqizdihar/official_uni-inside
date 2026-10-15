import * as THREE from 'three';
import { focusRing, softboxShell, type Point, type RoomAnimation, type RoomBuilderContext } from './roomGeometry';
import { advanceRotorAngle } from './heroMotion';

export function buildStudioRoom(context: RoomBuilderContext): RoomAnimation {
  const { room, static: fixed, materials, resources, batch, register } = context;

  function stand(x: number, z: number, height: number, spread: number) {
    fixed.cylinder('metal', 0.034, height, [x, height / 2 + 0.06, z]);
    fixed.cylinder('black', 0.065, 0.15, [x, height * 0.4, z]);
    for (let index = 0; index < 3; index++) {
      const angle = index * Math.PI * 2 / 3;
      fixed.beam('metal', [x, 0.34, z], [x + Math.cos(angle) * spread, 0.04, z + Math.sin(angle) * spread], 0.04);
    }
  }
  // Warm desktop, two drawer pedestals, and a wide editing screen follow the illustration.
  fixed.box('yellow', [3.04, 0.115, 0.89], [0, 0.9, 0.88]);
  fixed.box('ivory', [3.04, 0.018, 0.87], [0, 0.96, 0.87]);
  for (const x of [-1.14, 1.14]) {
    fixed.box('charcoal', [0.52, 0.83, 0.75], [x, 0.43, 0.85]);
    for (const y of [0.23, 0.46, 0.69]) {
      fixed.box('black', [0.45, 0.012, 0.014], [x, y, 1.231]);
      fixed.box('metal', [0.16, 0.02, 0.026], [x, y + 0.07, 1.246]);
    }
    fixed.box('black', [0.32, 0.42, 0.27], [x, 1.2, 0.82]);
    fixed.cylinder('metal', 0.09, 0.024, [x, 1.14, 0.963], [Math.PI / 2, 0, 0]);
    fixed.cylinder('black', 0.067, 0.026, [x, 1.14, 0.98], [Math.PI / 2, 0, 0]);
    fixed.cylinder('metal', 0.047, 0.025, [x, 1.31, 0.964], [Math.PI / 2, 0, 0]);
    fixed.box('yellow', [0.04, 0.012, 0.02], [x, 1.02, 0.969]);
  }
  fixed.box('black', [1.68, 0.74, 0.082], [0, 1.42, 0.78]);
  fixed.box('metal', [0.085, 0.22, 0.085], [0, 1.05, 0.78]);
  fixed.box('black', [0.47, 0.025, 0.23], [0, 0.984, 0.84]);
  fixed.box('black', [1.04, 0.032, 0.24], [-0.1, 0.988, 1.16]);
  for (let row = 0; row < 3; row++) for (let key = 0; key < 12; key++) {
    fixed.box('ivory', [0.059, 0.011, 0.043], [-0.53 + key * 0.077, 1.01, 1.085 + row * 0.06]);
  }
  fixed.box('metal', [0.13, 0.027, 0.17], [0.57, 0.992, 1.16]);
  fixed.box('charcoal', [0.33, 0.025, 0.17], [-0.82, 0.989, 1.11]);
  for (let index = 0; index < 4; index++) fixed.cylinder('yellow', 0.02, 0.014, [-0.94 + index * 0.075, 1.01, 1.12], undefined, 0.02, 6);
  fixed.box('metal', [1.51, 0.018, 1.61], [0, 0.014, 2.07]);
  fixed.box('black', [0.68, 0.09, 0.61], [0, 0.52, 2.02]);
  fixed.box('yellow', [0.56, 0.032, 0.54], [0, 0.58, 2.02]);
  fixed.box('black', [0.7, 0.81, 0.13], [0, 0.98, 2.24], [-0.1, 0, 0]);
  fixed.box('yellow', [0.51, 0.58, 0.038], [0, 1.01, 2.324], [-0.1, 0, 0]);
  fixed.box('black', [0.28, 0.11, 0.044], [0, 1.19, 2.367]);
  fixed.cylinder('metal', 0.06, 0.42, [0, 0.29, 2.02]);
  for (let index = 0; index < 5; index++) {
    const angle = index * Math.PI * 2 / 5;
    const x = Math.cos(angle) * 0.39;
    const z = 2.02 + Math.sin(angle) * 0.39;
    fixed.beam('black', [0, 0.13, 2.02], [x, 0.08, z], 0.045);
    fixed.cylinder('black', 0.062, 0.045, [x, 0.075, z], [0, 0, Math.PI / 2], 0.062, 6);
  }
  for (const x of [-0.38, 0.38]) {
    fixed.beam('black', [x, 0.51, 2.02], [x, 0.75, 2.02], 0.04);
    fixed.box('yellow', [0.11, 0.045, 0.37], [x, 0.77, 2.04]);
  }

  const editing = new THREE.Group();
  editing.name = 'hotspot-editing';
  editing.position.set(0, 1.42, 0.827);
  room.add(editing);
  const display = batch();
  display.box('screen', [1.53, 0.61, 0.012], [0, 0, 0]);
  const screenMeshes = display.compile(editing, 'editing-screen');
  // Interface, preview window and staggered timeline tracks are geometry, not images.
  fixed.box('black', [0.79, 0.28, 0.014], [-0.19, 1.54, 0.838]);
  fixed.box('sage', [0.49, 0.2, 0.014], [-0.2, 1.54, 0.85]);
  fixed.box('ivory', [0.095, 0.1, 0.016], [-0.32, 1.57, 0.865]);
  for (let row = 0; row < 4; row++) {
    for (let clip = 0; clip < 3; clip++) fixed.box(row % 2 ? 'yellow' : 'sage', [0.22 + clip * 0.05, 0.029, 0.014], [-0.5 + clip * 0.35 + row * 0.015, 1.17 + row * 0.047, 0.846]);
  }
  for (let row = 0; row < 6; row++) fixed.box('ivory', [0.24, 0.016, 0.014], [0.58, 1.4 + row * 0.047, 0.845]);
  const cursor = new THREE.Group();
  cursor.name = 'timeline-cursor';
  editing.add(cursor);
  const cursorShape = batch();
  cursorShape.box('yellow', [0.012, 0.23, 0.016], [-0.34, -0.155, 0.034]);
  cursorShape.compile(cursor, 'timeline-cursor');
  register('editing', editing, [0, 0.05, 0.04], screenMeshes);
  const screenColors = screenMeshes[0].geometry.getAttribute('color') as THREE.BufferAttribute;
  const screenAccent = batch();
  for (let index = 0; index < 6; index++) screenAccent.box('screen', [0.15, 0.018, 0.01], [-0.52 + index * 0.2, 0.272, 0.022]);
  const accentMeshes = screenAccent.compile(editing, 'editing-rgb-accents');
  const accentColors = accentMeshes[0].geometry.getAttribute('color') as THREE.BufferAttribute;
  const accentColor = new THREE.Color();
  let lastAccentHue = Number.NaN;
  let lastAccentSpread = Number.NaN;

  // Camera on a spread tripod, with a stepped lens and recognizable top handle.
  const camera = new THREE.Group();
  camera.name = 'hotspot-camera';
  camera.position.set(-1.85, 1.06, 2.84);
  camera.rotation.y = -0.11;
  room.add(camera);
  const cameraHead = new THREE.Group();
  cameraHead.position.y = 0.09;
  camera.add(cameraHead);
  const cameraBody = batch();
  cameraBody.box('black', [0.46, 0.3, 0.3], [0, 0, 0]);
  cameraBody.box('charcoal', [0.08, 0.25, 0.27], [-0.24, -0.015, 0]);
  cameraBody.box('black', [0.31, 0.054, 0.11], [0, 0.24, -0.015]);
  for (const x of [-0.11, 0.11]) cameraBody.box('metal', [0.04, 0.13, 0.065], [x, 0.175, -0.015]);
  cameraBody.box('metal', [0.145, 0.09, 0.12], [-0.11, 0.08, -0.17]);
  cameraBody.box('black', [0.18, 0.13, 0.14], [0.13, 0.17, -0.035]);
  cameraBody.cylinder('charcoal', 0.153, 0.125, [0.055, -0.007, 0.2], [Math.PI / 2, 0, 0]);
  cameraBody.cylinder('black', 0.13, 0.19, [0.055, -0.007, 0.316], [Math.PI / 2, 0, 0]);
  cameraBody.cylinder('metal', 0.095, 0.014, [0.055, -0.007, 0.413], [Math.PI / 2, 0, 0]);
  cameraBody.cylinder('black', 0.077, 0.016, [0.055, -0.007, 0.425], [Math.PI / 2, 0, 0]);
  cameraBody.box('yellow', [0.035, 0.027, 0.013], [-0.15, 0.075, 0.158]);
  const cameraMeshes = cameraBody.compileColored(cameraHead, 'camera');
  const lens = new THREE.Group();
  lens.name = 'camera-focus-ring';
  cameraHead.add(lens);
  const lensShape = batch();
  lensShape.add(focusRing(0.14, 0.112, 0.035), 'yellow', [0.055, -0.007, 0.354]);
  cameraMeshes.push(...lensShape.compile(lens, 'camera-focus-ring'));
  stand(-1.85, 2.84, 1.02, 0.42);
  fixed.box('black', [0.24, 0.075, 0.22], [-1.85, 1.06, 2.84]);
  fixed.beam('black', [-1.81, 1.04, 2.84], [-1.51, 0.98, 2.98], 0.03);
  register('camera', camera, [0.055, 0.135, 0.37], cameraMeshes);

  fixed.box('ivory', [1.3, 0.075, 0.83], [1.86, 0.79, 2.73]);
  fixed.box('yellow', [1.3, 0.035, 0.065], [1.86, 0.82, 3.105]);
  for (const x of [1.34, 2.38]) for (const z of [2.41, 3.04]) fixed.box('charcoal', [0.065, 0.77, 0.065], [x, 0.39, z]);
  fixed.box('black', [0.36, 0.065, 0.2], [1.63, 0.869, 3.02], [-0.1, 0, 0]);
  fixed.box('metal', [0.15, 0.022, 0.095], [1.63, 0.913, 3.016], [-0.1, 0, 0]);
  for (const x of [1.49, 1.77]) fixed.cylinder('black', 0.018, 0.065, [x, 0.93, 3.015], undefined, 0.018, 6);
  fixed.cylinder('black', 0.055, 0.24, [2.32, 0.95, 3.02]);
  fixed.box('yellow', [0.12, 0.055, 0.07], [2.32, 1.07, 3.04]);
  const drone = new THREE.Group();
  drone.name = 'hotspot-drone';
  drone.position.set(1.84, 0.98, 2.69);
  room.add(drone);
  const droneBody = batch();
  droneBody.box('ivory', [0.34, 0.13, 0.43], [0, 0, 0]);
  droneBody.box('yellow', [0.22, 0.015, 0.31], [0, 0.078, 0]);
  droneBody.box('black', [0.14, 0.09, 0.12], [0, -0.045, 0.24]);
  droneBody.cylinder('metal', 0.04, 0.046, [0, -0.045, 0.32], [Math.PI / 2, 0, 0]);
  for (const x of [-0.12, 0.12]) droneBody.beam('black', [x, -0.045, -0.16], [x, -0.13, 0.14], 0.025);
  const rotorPositions: [number, number, number][] = [];
  for (const x of [-0.36, 0.36]) for (const z of [-0.3, 0.3]) {
    droneBody.beam('yellow', [Math.sign(x) * 0.1, 0.012, Math.sign(z) * 0.1], [x, 0.024, z], 0.065, 0.085);
    droneBody.cylinder('black', 0.05, 0.07, [x, 0.05, z]);
    rotorPositions.push([x, 0.11, z]);
  }
  const droneMeshes = droneBody.compileColored(drone, 'drone');
  const propGeometry = new THREE.BoxGeometry(0.43, 0.017, 0.045);
  const propColors = new Float32Array(propGeometry.getAttribute('position').count * 3).fill(1);
  propGeometry.setAttribute('color', new THREE.BufferAttribute(propColors, 3));
  resources.add(propGeometry);
  const propellers = new THREE.InstancedMesh(propGeometry, materials.black, 4);
  propellers.name = 'drone-propellers';
  drone.add(propellers);
  droneMeshes.push(propellers);
  const rotorTransform = new THREE.Object3D();
  register('drone', drone, [0, 0.08, 0.13], droneMeshes);

  const light = new THREE.Group();
  light.name = 'hotspot-lighting';
  light.position.set(-2.5, 1.95, 1.65);
  light.rotation.y = 0.21;
  room.add(light);
  const lightHead = new THREE.Group();
  lightHead.position.y = 0.09;
  light.add(lightHead);
  const lightShape = batch();
  lightShape.add(softboxShell(1.03, 0.88, 0.3), 'black');
  lightShape.box('ivory', [0.93, 0.78, 0.018], [0, 0, 0.161]);
  const lightMeshes = lightShape.compile(lightHead, 'softbox');
  const panel = lightMeshes.find((mesh) => mesh.name.endsWith('ivory'))!;
  const panelColors = panel.geometry.getAttribute('color') as THREE.BufferAttribute;
  stand(-2.5, 1.65, 1.89, 0.36);
  register('lighting', light, [0, 0.09, 0.172], lightMeshes);
  stand(2.46, 1.72, 1.78, 0.31);
  fixed.box('black', [0.46, 0.44, 0.075], [2.46, 1.96, 1.72], [0, -0.2, 0]);
  fixed.box('ivory', [0.39, 0.36, 0.014], [2.449, 1.96, 1.766], [0, -0.2, 0]);

  stand(-1.35, 1.76, 1.55, 0.28);
  const micBoom = new THREE.Group();
  micBoom.name = 'hotspot-microphone';
  micBoom.position.set(-1.35, 1.59, 1.76);
  room.add(micBoom);
  const boomShape = batch();
  boomShape.beam('metal', [0, 0, 0], [0.63, 0.24, -0.48], 0.033);
  boomShape.beam('black', [0, 0, 0], [-0.26, -0.1, 0.19], 0.033);
  boomShape.compile(micBoom, 'microphone-boom');
  const microphone = new THREE.Group();
  microphone.name = 'microphone-body';
  microphone.position.set(0.62, 0.17, -0.47);
  micBoom.add(microphone);
  const micShape = batch();
  micShape.cylinder('black', 0.071, 0.27, [0, 0, 0], [0.47, 0, -0.28]);
  micShape.cylinder('metal', 0.076, 0.09, [0.02, 0.11, 0.04], [0.47, 0, -0.28]);
  micShape.box('yellow', [0.023, 0.055, 0.018], [0.022, -0.02, 0.08]);
  const micMeshes = micShape.compileColored(microphone, 'microphone');
  register('microphone', micBoom, [0.625, 0.21, -0.405], micMeshes);

  const shelf = batch();
  shelf.box('charcoal', [1.28, 0.07, 0.38], [0, 0, 0]);
  shelf.box('yellow', [1.28, 0.024, 0.046], [0, 0.042, 0.19]);
  shelf.box('black', [0.33, 0.24, 0.21], [-0.32, 0.16, 0]);
  shelf.cylinder('metal', 0.08, 0.14, [-0.32, 0.15, 0.18], [Math.PI / 2, 0, 0]);
  for (const x of [0.15, 0.45]) {
    shelf.cylinder('black', 0.085, 0.25, [x, 0.16, 0]);
    shelf.cylinder('metal', 0.089, 0.04, [x, 0.26, 0]);
  }
  fixed.append(shelf, -Math.PI / 4, [2.68, 1.44, 0.94]);
  const pegboard = batch();
  pegboard.box('charcoal', [1.08, 0.64, 0.045], [0, 0, 0]);
  for (let column = 0; column < 6; column++) for (let row = 0; row < 3; row++) pegboard.box('metal', [0.022, 0.022, 0.011], [-0.44 + column * 0.175, -0.21 + row * 0.19, 0.032]);
  const cable: Point[] = [[-0.35, 0.12, 0.06], [-0.11, 0.22, 0.06], [0.06, 0.1, 0.06], [0.05, -0.13, 0.06], [-0.2, -0.22, 0.06], [-0.36, -0.08, 0.06], [-0.35, 0.12, 0.06]];
  for (let index = 1; index < cable.length; index++) pegboard.beam('yellow', cable[index - 1], cable[index], 0.025);
  pegboard.beam('metal', [0.25, 0.18, 0.06], [0.25, -0.08, 0.06], 0.025);
  pegboard.box('yellow', [0.08, 0.13, 0.03], [0.25, -0.16, 0.06]);
  pegboard.box('metal', [0.17, 0.07, 0.06], [0.4, 0.16, 0.07]);
  fixed.append(pegboard, Math.PI / 4, [-2.72, 1.91, 0.98]);
  fixed.box('charcoal', [0.65, 0.27, 0.38], [-2.64, 0.16, 2.34]);
  fixed.box('metal', [0.21, 0.035, 0.05], [-2.64, 0.306, 2.54]);
  fixed.box('yellow', [0.028, 0.055, 0.027], [-2.86, 0.29, 2.54]);
  for (const x of [-1.59, 1.59]) {
    fixed.box('black', [0.17, 0.12, 0.1], [x, 2.39, 0.145]);
    fixed.box('ivory', [0.11, 0.038, 0.115], [x, 2.315, 0.18]);
  }

  let rotorAngle = 0;
  let lastRotorTime = 0;
  let lastRotorRotation = Number.NaN;
  let lastScreenLevel = Number.NaN;
  let lastPanelLevel = Number.NaN;
  return (activity, time, reducedMotion) => {
    const wave = reducedMotion ? 0 : Math.sin(time * 1.35);
    camera.rotation.y = -0.11 + activity.camera * wave * 0.35;
    camera.rotation.x = activity.camera * wave * 0.035;
    lens.scale.setScalar(1 + activity.camera * (0.025 + wave * 0.013));
    drone.position.y = 0.98 + activity.drone * (0.16 + wave * 0.015);
    const rotorDelta = time - lastRotorTime;
    lastRotorTime = time;
    rotorAngle = reducedMotion ? rotorAngle : advanceRotorAngle(rotorAngle, rotorDelta, activity.drone);
    const rotorRotation = rotorAngle;
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
    cursor.position.x = activity.editing * (reducedMotion ? 0.16 : (Math.sin(time * 1.9) + 1) * 0.27);
    const screenLevel = 0.83 + activity.editing * 0.17;
    if (screenLevel !== lastScreenLevel) {
      (screenColors.array as Float32Array).fill(screenLevel);
      screenColors.needsUpdate = true;
      lastScreenLevel = screenLevel;
    }
    const accentActivity = reducedMotion ? 0 : activity.editing;
    const accentHue = (0.12 + accentActivity * ((time * 0.08) % 1)) % 1;
    if (accentHue !== lastAccentHue || accentActivity !== lastAccentSpread) {
      const values = accentColors.array as Float32Array;
      for (let vertex = 0; vertex < accentColors.count; vertex++) {
        const segment = Math.floor(vertex / 36);
        accentColor.setHSL((accentHue + segment * accentActivity / 6) % 1, 0.86 * accentActivity + 0.48 * (1 - accentActivity), 0.76);
        values[vertex * 3] = accentColor.r;
        values[vertex * 3 + 1] = accentColor.g;
        values[vertex * 3 + 2] = accentColor.b;
      }
      accentColors.needsUpdate = true;
      lastAccentHue = accentHue;
      lastAccentSpread = accentActivity;
    }
    light.rotation.z = activity.lighting * wave * 0.36;
    const panelLevel = 0.83 + activity.lighting * (0.14 + (wave + 1) * 0.015);
    if (panelLevel !== lastPanelLevel) {
      (panelColors.array as Float32Array).fill(panelLevel);
      panelColors.needsUpdate = true;
      lastPanelLevel = panelLevel;
    }
    micBoom.rotation.y = activity.microphone * wave * 0.28;
    micBoom.rotation.z = activity.microphone * wave * 0.18;
  };
}
