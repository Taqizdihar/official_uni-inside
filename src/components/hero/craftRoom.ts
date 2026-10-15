import * as THREE from 'three';
import type { HotspotId } from './heroConfig';
import { smoothStep } from './heroMotion';
import type { Point, RoomBuilderContext } from './roomGeometry';

/** The workshop is authored in its own coordinates, then turned with the room. */
export function buildCraftRoom(context: RoomBuilderContext) {
  const { room, static: furniture, resources, materials } = context;
  const moving = new THREE.Object3D();

  function object(id: HotspotId, position: Point, rotationY = 0) {
    const group = new THREE.Group();
    group.name = `hotspot-${id}`;
    group.position.set(...position);
    group.rotation.y = rotationY;
    room.add(group);
    return group;
  }

  function table(x: number, z: number, width: number, depth: number, surface: 'ivory' | 'yellow' = 'ivory', yaw = 0) {
    const frame = context.batch();
    frame.box(surface, [width, 0.12, depth], [0, 0.99, 0]);
    frame.box('charcoal', [width - 0.1, 0.13, 0.08], [0, 0.88, depth / 2 - 0.07]);
    for (const dx of [-width / 2 + 0.09, width / 2 - 0.09]) {
      for (const dz of [-depth / 2 + 0.08, depth / 2 - 0.08]) {
        frame.box('charcoal', [0.075, 0.94, 0.075], [dx, 0.47, dz]);
      }
    }
    furniture.append(frame, yaw, [x, 0, z]);
  }

  // The Craft room turns with the diorama: negative local X reads as screen-left.
  const printerBench: Point = [-2.97, 0, 1.47];
  const designDesk: Point = [2.55, 0, 1.3];
  const printerYaw = Math.PI / 4;
  const designYaw = -Math.PI / 4;
  table(printerBench[0], printerBench[2], 1.8, 0.95, 'yellow', printerYaw);
  const printerStorage = context.batch();
  printerStorage.box('charcoal', [0.46, 0.81, 0.62], [0.5, 0.435, 0]);
  for (const y of [0.26, 0.49, 0.72]) {
    printerStorage.box('black', [0.4, 0.012, 0.016], [0.5, y, 0.318]);
    printerStorage.box('metal', [0.13, 0.02, 0.025], [0.5, y + 0.065, 0.332]);
  }
  printerStorage.box('charcoal', [0.39, 0.29, 0.5], [-0.55, 0.18, -0.03]);
  printerStorage.box('metal', [0.14, 0.025, 0.03], [-0.55, 0.333, 0.23]);
  furniture.append(printerStorage, printerYaw, printerBench);
  table(designDesk[0], designDesk[2], 1.4, 0.84, 'ivory', designYaw);
  table(0, 0.85, 1.63, 0.76, 'yellow');
  const paintingFurniture = context.batch();
  // A low chair faces the rear painting bench and leaves an aisle to packing.
  paintingFurniture.box('charcoal', [0.46, 0.09, 0.43], [0, 0.49, 1.69]);
  paintingFurniture.box('yellow', [0.42, 0.045, 0.39], [0, 0.56, 1.69]);
  paintingFurniture.box('charcoal', [0.46, 0.58, 0.08], [0, 0.91, 1.91], [-0.12, 0, 0]);
  paintingFurniture.box('yellow', [0.31, 0.26, 0.025], [0, 1.02, 1.959], [-0.12, 0, 0]);
  for (const x of [-0.18, 0.18]) {
    paintingFurniture.box('charcoal', [0.055, 0.48, 0.055], [x, 0.24, 1.52]);
    paintingFurniture.box('charcoal', [0.055, 0.48, 0.055], [x, 0.24, 1.87]);
  }
  // A single drawer cabinet sits to the right of the painting bench.
  paintingFurniture.box('charcoal', [0.39, 0.96, 0.53], [1.13, 0.48, 0.77]);
  for (const y of [0.25, 0.51, 0.77]) {
    paintingFurniture.box('ivory', [0.32, 0.2, 0.018], [1.13, y, 1.045]);
    paintingFurniture.box('metal', [0.13, 0.019, 0.025], [1.13, y, 1.06]);
  }
  furniture.append(paintingFurniture);
  const designChair = context.batch();
  designChair.box('yellow', [0.49, 0.09, 0.43], [0, 0.53, 1.03]);
  designChair.box('charcoal', [0.49, 0.5, 0.09], [0, 0.82, 1.23], [-0.1, 0, 0]);
  designChair.box('yellow', [0.34, 0.24, 0.045], [0, 0.91, 1.285], [-0.1, 0, 0]);
  designChair.cylinder('metal', 0.045, 0.48, [0, 0.25, 1.03]);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    designChair.beam('metal', [0, 0.08, 1.03], [Math.cos(angle) * 0.26, 0.06, 1.03 + Math.sin(angle) * 0.26], 0.045);
  }
  furniture.append(designChair, designYaw, designDesk);

  const printer = object('printer', [printerBench[0], 1.055, printerBench[2]], printerYaw);
  const printerBody = context.batch();
  printerBody.box('black', [1.22, 0.095, 0.7], [0, 0.052, -0.025]);
  printerBody.box('charcoal', [0.35, 0.07, 0.78], [-0.395, 0.12, 0.015]);
  printerBody.box('charcoal', [0.35, 0.07, 0.78], [0.395, 0.12, 0.015]);
  // The exposed gantry and forward sliding bed identify an open bed-slinger FDM printer.
  for (const x of [-0.48, 0.48]) {
    printerBody.box('charcoal', [0.095, 1.02, 0.09], [x, 0.67, -0.21]);
    printerBody.box('metal', [0.023, 0.96, 0.024], [x + 0.033, 0.66, -0.15]);
    printerBody.box('black', [0.18, 0.1, 0.27], [x, 0.2, -0.21]);
  }
  printerBody.box('charcoal', [1.04, 0.11, 0.095], [0, 1.16, -0.21]);
  printerBody.box('yellow', [0.2, 0.115, 0.027], [-0.39, 1.16, -0.148]);
  printerBody.box('yellow', [0.2, 0.115, 0.027], [0.39, 1.16, -0.148]);
  printerBody.box('metal', [1.04, 0.043, 0.043], [0, 0.73, -0.145]);
  printerBody.box('charcoal', [0.048, 0.038, 0.72], [-0.17, 0.185, 0.035]);
  printerBody.box('charcoal', [0.048, 0.038, 0.72], [0.17, 0.185, 0.035]);
  printerBody.box('black', [0.26, 0.2, 0.12], [0.6, 0.19, 0.26], [-0.34, 0, 0]);
  printerBody.box('screen', [0.19, 0.125, 0.012], [0.6, 0.212, 0.328], [-0.34, 0, 0]);
  printerBody.beam('yellow', [0.37, 1.2, -0.23], [0.29, 1.3, -0.15], 0.02);
  printerBody.beam('yellow', [0.29, 1.3, -0.15], [0, 0.87, -0.11], 0.016);
  printerBody.beam('metal', [0.48, 0.99, -0.24], [0.68, 0.99, -0.24], 0.035);
  furniture.append(printerBody, printerYaw, [printerBench[0], 1.055, printerBench[2]]);
  const printerHits: THREE.Object3D[] = [];

  const printBed = new THREE.Group();
  printBed.position.set(0, 0.235, 0.12);
  printer.add(printBed);
  const bed = context.batch();
  bed.box('charcoal', [0.77, 0.065, 0.69], [0, 0, 0]);
  bed.box('black', [0.7, 0.02, 0.62], [0, 0.041, 0]);
  bed.cylinder('yellow', 0.12, 0.17, [0, 0.135, 0], undefined, 0.095, 6);
  printerHits.push(...bed.compileColored(printBed, 'craft-print-bed'));

  const printHead = new THREE.Group();
  printHead.position.set(0, 0.73, -0.12);
  printer.add(printHead);
  const head = context.batch();
  head.box('black', [0.24, 0.19, 0.2], [0, 0, 0]);
  head.box('yellow', [0.155, 0.12, 0.03], [0, -0.008, 0.116]);
  head.cylinder('metal', 0.024, 0.07, [0, -0.13, 0.06], undefined, 0.042, 6);
  printerHits.push(...head.compileColored(printHead, 'craft-print-head'));

  const feedSpool = new THREE.Group();
  feedSpool.position.set(0.67, 1.02, -0.24);
  feedSpool.rotation.z = Math.PI / 2;
  printer.add(feedSpool);
  const feed = context.batch();
  feed.cylinder('yellow', 0.15, 0.135, [0, 0, 0]);
  feed.cylinder('charcoal', 0.2, 0.025, [0, -0.082, 0]);
  feed.cylinder('charcoal', 0.2, 0.025, [0, 0.082, 0]);
  feed.cylinder('metal', 0.045, 0.17, [0, 0, 0]);
  printerHits.push(...feed.compileColored(feedSpool, 'craft-feed-spool'));
  context.register('printer', printHead, [0, 0, 0.145], printerHits);

  const design = object('design', [designDesk[0], 1.055, designDesk[2]], designYaw);
  const monitor = context.batch();
  monitor.box('charcoal', [0.95, 0.58, 0.075], [0, 0.48, 0]);
  monitor.box('charcoal', [0.07, 0.23, 0.07], [0, 0.15, 0]);
  monitor.box('charcoal', [0.4, 0.035, 0.23], [0, 0.015, 0.02]);
  monitor.box('metal', [0.61, 0.025, 0.2], [-0.035, 0.012, 0.39]);
  monitor.box('charcoal', [0.07, 0.034, 0.1], [0.43, 0.018, 0.41]);
  // A small CAD viewport, tool column, and axis guides are all geometry.
  monitor.box('charcoal', [0.16, 0.46, 0.016], [-0.344, 0.48, 0.055]);
  for (let row = 0; row < 4; row++) {
    monitor.box('metal', [0.1, 0.019, 0.019], [-0.345, 0.64 - row * 0.08, 0.066]);
  }
  monitor.box('yellow', [0.1, 0.013, 0.02], [-0.16, 0.285, 0.063]);
  monitor.box('yellow', [0.013, 0.105, 0.02], [-0.205, 0.332, 0.063]);
  furniture.append(monitor, designYaw, [designDesk[0], 1.055, designDesk[2]]);
  const designScreen = context.batch();
  designScreen.box('screen', [0.86, 0.48, 0.012], [0, 0.48, 0.045]);
  const designHits: THREE.Object3D[] = designScreen.compile(design, 'craft-design-screen');
  const designScreenColors = (designHits[0] as THREE.Mesh).geometry.getAttribute('color') as THREE.BufferAttribute;
  const designAccents = context.batch();
  for (let index = 0; index < 6; index++) designAccents.box('screen', [0.12, 0.016, 0.008], [-0.34 + index * 0.135, 0.69, 0.058]);
  designAccents.box('screen', [0.016, 0.2, 0.008], [0.408, 0.52, 0.058]);
  const designAccentMeshes = designAccents.compile(design, 'craft-design-rgb-accents');
  const designAccentColors = designAccentMeshes[0].geometry.getAttribute('color') as THREE.BufferAttribute;
  const accentColor = new THREE.Color();
  let lastDesignAccentHue = Number.NaN;
  let lastDesignAccentSpread = Number.NaN;
  designHits.push(...designAccentMeshes);
  const designModel = new THREE.Group();
  designModel.position.set(0.09, 0.485, 0.08);
  design.add(designModel);
  const model = context.batch();
  model.ball('sage', 0.18, [0, 0, 0]);
  model.cylinder('sage', 0.09, 0.11, [0, -0.19, 0], undefined, 0.11, 6);
  designHits.push(...model.compileColored(designModel, 'craft-cad-model'));
  context.register('design', design, [0.04, 0.48, 0.11], designHits);

  const painting = object('painting', [0, 1.055, 0.85]);
  const finishing = context.batch();
  finishing.box('sage', [0.94, 0.012, 0.56], [0.13, 0.006, 0.045]);
  finishing.cylinder('ivory', 0.2, 0.024, [-0.44, 0.02, 0.2], undefined, 0.2, 8);
  for (const [x, z, color] of [[-0.53, 0.16, 'yellow'], [-0.41, 0.09, 'coral'], [-0.36, 0.25, 'sage']] as const) {
    finishing.cylinder(color, 0.045, 0.012, [x, 0.039, z], undefined, 0.045, 6);
  }
  for (const [x, color] of [[0.48, 'coral'], [0.62, 'yellow'], [0.33, 'ivory']] as const) {
    finishing.cylinder(color, 0.045, 0.1, [x, 0.05, -0.12], undefined, 0.045, 6);
    finishing.cylinder('charcoal', 0.049, 0.022, [x, 0.111, -0.12], undefined, 0.049, 6);
  }
  finishing.cylinder('ivory', 0.1, 0.18, [-0.57, 0.09, -0.17]);
  finishing.beam('metal', [-0.61, 0.08, -0.17], [-0.66, 0.38, -0.12], 0.018);
  finishing.beam('metal', [-0.55, 0.08, -0.17], [-0.51, 0.34, -0.2], 0.018);
  finishing.cylinder('ivory', 0.12, 0.13, [0.1, 0.065, 0.1], undefined, 0.08, 6);
  finishing.ball('ivory', 0.12, [0.1, 0.225, 0.1]);
  finishing.cylinder('ivory', 0.045, 0.085, [0.02, 0.33, 0.1], undefined, 0, 4);
  finishing.cylinder('ivory', 0.045, 0.085, [0.18, 0.33, 0.1], undefined, 0, 4);
  finishing.box('charcoal', [0.027, 0.026, 0.018], [0.054, 0.238, 0.213]);
  finishing.box('charcoal', [0.027, 0.026, 0.018], [0.146, 0.238, 0.213]);
  furniture.append(finishing, 0, [0, 1.055, 0.85]);
  const paintingHits: THREE.Object3D[] = [];
  const brush = new THREE.Group();
  brush.position.set(-0.17, 0.13, 0.14);
  brush.rotation.z = -0.48;
  painting.add(brush);
  const brushParts = context.batch();
  brushParts.box('yellow', [0.026, 0.32, 0.025], [0, 0.05, 0]);
  brushParts.box('metal', [0.039, 0.06, 0.03], [0, -0.135, 0]);
  brushParts.box('coral', [0.033, 0.07, 0.025], [0, -0.19, 0]);
  paintingHits.push(...brushParts.compileColored(brush, 'craft-paint-brush'));
  context.register('painting', brush, [0, 0.1, 0.035], paintingHits);
  const brushRestPosition = brush.position.clone();
  const brushRestRotation = brush.rotation.clone();
  const brushPath = [
    { position: brushRestPosition, rotation: brushRestRotation },
    { position: new THREE.Vector3(-0.27, 0.29, 0.15), rotation: new THREE.Euler(0, 0, -1.2) },
    { position: new THREE.Vector3(-0.12, 0.25, 0.15), rotation: new THREE.Euler(0, 0, -1.35) },
    { position: new THREE.Vector3(0.08, 0.31, 0.38), rotation: new THREE.Euler(0.72, 0, 0) },
    { position: new THREE.Vector3(0.22, 0.25, 0.34), rotation: new THREE.Euler(0.76, 0, 0.42) },
    { position: new THREE.Vector3(0.32, 0.24, 0.12), rotation: new THREE.Euler(0, 0, 1.32) },
    { position: brushRestPosition, rotation: brushRestRotation },
  ];

  const filamentPosition: Point = [-2.12, 0, 0.73];
  const filament = object('filament', filamentPosition, Math.PI / 4);
  const rack = context.batch();
  // One spool per shelf makes the floor-standing filament tower read clearly.
  rack.box('charcoal', [0.5, 0.14, 0.45], [0, 0.07, 0]);
  rack.box('charcoal', [0.5, 0.1, 0.45], [0, 2.62, 0]);
  rack.box('black', [0.46, 2.38, 0.035], [0, 1.38, -0.215]);
  for (const x of [-0.225, 0.225]) {
    rack.box('charcoal', [0.05, 2.48, 0.45], [x, 1.32, 0]);
  }
  for (const height of [0.44, 0.89, 1.34, 1.79, 2.24]) {
    rack.box('charcoal', [0.45, 0.045, 0.43], [0, height, 0]);
  }
  rack.box('ivory', [0.4, 0.27, 0.028], [0, 0.27, 0.24]);
  rack.box('metal', [0.16, 0.025, 0.028], [0, 0.31, 0.264]);
  rack.box('yellow', [0.5, 0.03, 0.06], [0, 2.685, 0.18]);
  furniture.append(rack, Math.PI / 4, filamentPosition);
  const filamentHits: THREE.Object3D[] = [];
  const spoolCoreGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.14, 8);
  const spoolFlange = new THREE.Shape();
  const spoolOpening = new THREE.Path();
  for (let vertex = 0; vertex < 8; vertex++) {
    const angle = vertex * Math.PI / 4;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (vertex === 0) {
      spoolFlange.moveTo(x * 0.19, y * 0.19);
      spoolOpening.moveTo(x * 0.112, -y * 0.112);
    } else {
      spoolFlange.lineTo(x * 0.19, y * 0.19);
      spoolOpening.lineTo(x * 0.112, -y * 0.112);
    }
  }
  spoolFlange.closePath();
  spoolOpening.closePath();
  spoolFlange.holes.push(spoolOpening);
  // An open octagonal flange reveals the colored filament instead of masking it.
  const spoolFlangeGeometry = new THREE.ExtrudeGeometry(spoolFlange, { depth: 0.025, bevelEnabled: false, steps: 1, curveSegments: 1 });
  spoolFlangeGeometry.translate(0, 0, -0.0125);
  spoolFlangeGeometry.rotateX(Math.PI / 2);
  // Instanced geometry bypasses GeometryBatch's white vertex-color initialization.
  for (const geometry of [spoolCoreGeometry, spoolFlangeGeometry]) {
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
  }
  resources.add(spoolCoreGeometry);
  resources.add(spoolFlangeGeometry);
  const cores = new THREE.InstancedMesh(spoolCoreGeometry, materials.ivory, 5);
  const flanges = new THREE.InstancedMesh(spoolFlangeGeometry, materials.charcoal, 10);
  cores.name = 'craft-filament-cores';
  flanges.name = 'craft-filament-flanges';
  for (const mesh of [cores, flanges]) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    filament.add(mesh);
    filamentHits.push(mesh);
  }
  const spoolPositions: Point[] = [
    [0, 0.68, 0.08], [0, 1.13, 0.08], [0, 1.58, 0.08],
    [0, 2.03, 0.08], [0, 2.48, 0.08],
  ];
  const spoolColors = ['#e5ae34', '#252a2d', '#e7e4d9', '#e5ae34', '#252a2d'];
  const spoolAxis = new THREE.Vector3();
  function setSpool(index: number, rotation: number, frontOffset: number) {
    const position = spoolPositions[index];
    moving.position.set(position[0], position[1], position[2] + frontOffset);
    moving.rotation.set(Math.PI / 2, rotation, 0);
    moving.updateMatrix();
    cores.setMatrixAt(index, moving.matrix);
    spoolAxis.set(0, 1, 0).applyQuaternion(moving.quaternion);
    for (let side = 0; side < 2; side++) {
      moving.position.set(position[0], position[1], position[2] + frontOffset).addScaledVector(spoolAxis, side ? 0.085 : -0.085);
      moving.updateMatrix();
      flanges.setMatrixAt(index * 2 + side, moving.matrix);
    }
  }
  for (let index = 0; index < spoolPositions.length; index++) {
    setSpool(index, 0, 0);
    cores.setColorAt(index, new THREE.Color(spoolColors[index]));
  }
  cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flanges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const mesh of [cores, flanges]) {
    mesh.computeBoundingSphere();
  }
  context.register('filament', filament, [0, 1.58, 0.15], filamentHits);

  const packagingCenter: Point = [0, 0, 2.9];
  const products = object('products', [packagingCenter[0], 1.055, packagingCenter[2]]);
  const display = context.batch();
  // Decorative wall shelf follows the design desk. Product interaction lives on the center table.
  display.box('yellow', [1.54, 0.06, 0.38], [0, 0, 0]);
  for (const x of [-0.54, 0.54]) {
    display.box('charcoal', [0.05, 0.28, 0.05], [x, -0.13, -0.145]);
    display.beam('charcoal', [x, -0.26, -0.145], [x, -0.03, 0.12], 0.04);
  }
  // Printed planter, geometric model, and miniature trophy establish the product mix.
  display.cylinder('charcoal', 0.105, 0.17, [-0.57, 0.115, 0], undefined, 0.125, 6);
  display.cylinder('black', 0.095, 0.012, [-0.57, 0.207, 0], undefined, 0.095, 6);
  display.box('sage', [0.035, 0.23, 0.035], [-0.57, 0.31, 0]);
  display.beam('sage', [-0.57, 0.26, 0], [-0.68, 0.36, 0], 0.045);
  display.beam('sage', [-0.57, 0.29, 0], [-0.48, 0.41, 0], 0.045);
  display.cylinder('ivory', 0.12, 0.055, [-0.18, 0.06, 0], undefined, 0.12, 6);
  display.ball('ivory', 0.16, [-0.18, 0.22, 0]);
  display.box('charcoal', [0.15, 0.055, 0.15], [0.12, 0.059, 0]);
  display.cylinder('yellow', 0.026, 0.15, [0.12, 0.158, 0], undefined, 0.028, 6);
  display.cylinder('yellow', 0.075, 0.11, [0.12, 0.28, 0], undefined, 0.105, 6);
  display.beam('yellow', [0.05, 0.28, 0], [-0.01, 0.24, 0], 0.018);
  display.beam('yellow', [0.19, 0.28, 0], [0.25, 0.24, 0], 0.018);
  furniture.append(display, designYaw, [2.66, 1.95, 1.0]);
  table(packagingCenter[0], packagingCenter[2], 2.02, 1.02, 'ivory');
  const packaging = context.batch();
  // Stacked closed cartons have thin tape strips; an open carton exposes its darker interior.
  packaging.box('kraft', [0.47, 0.27, 0.36], [-0.69, 1.19, -0.2], [0, 0.1, 0]);
  packaging.box('tape', [0.075, 0.012, 0.37], [-0.69, 1.333, -0.2], [0, 0.1, 0]);
  packaging.box('kraftLight', [0.3, 0.17, 0.27], [-0.67, 1.42, -0.2], [0, -0.06, 0]);
  packaging.box('tape', [0.3, 0.012, 0.055], [-0.67, 1.512, -0.2], [0, -0.06, 0]);
  packaging.box('kraftDark', [0.39, 0.025, 0.3], [0.68, 1.065, -0.2]);
  for (const x of [0.475, 0.885]) packaging.box('kraftLight', [0.025, 0.24, 0.34], [x, 1.18, -0.2]);
  for (const z of [-0.355, -0.045]) packaging.box('kraftLight', [0.43, 0.24, 0.025], [0.68, 1.18, z]);
  packaging.box('kraft', [0.22, 0.018, 0.33], [0.39, 1.32, -0.2], [0, 0, -0.42]);
  packaging.box('kraft', [0.22, 0.018, 0.33], [0.97, 1.32, -0.2], [0, 0, 0.42]);
  packaging.box('kraftLight', [0.43, 0.018, 0.16], [0.68, 1.32, -0.43], [-0.35, 0, 0]);
  packaging.box('kraftLight', [0.43, 0.018, 0.16], [0.68, 1.32, 0.03], [0.35, 0, 0]);
  packaging.box('kraft', [0.56, 0.35, 0.43], [-0.62, 0.18, 0.14], [0, -0.14, 0]);
  packaging.box('tape', [0.075, 0.012, 0.44], [-0.62, 0.362, 0.14], [0, -0.14, 0]);
  packaging.box('kraftLight', [0.38, 0.26, 0.32], [0.08, 0.13, -0.08], [0, 0.1, 0]);
  packaging.box('tape', [0.38, 0.012, 0.052], [0.08, 0.268, -0.08], [0, 0.1, 0]);
  packaging.box('kraftDark', [0.31, 0.24, 0.29], [0.6, 0.42, 0.1], [0, -0.08, 0]);
  const packagingGroup = new THREE.Group();
  packagingGroup.position.set(...packagingCenter);
  room.add(packagingGroup);
  packaging.compileColored(packagingGroup, 'craft-cardboard-packaging');
  const productHits: THREE.Object3D[] = [];
  const productAnchors: Point[] = [[-0.45, 0, 0.3], [0, 0, 0.3], [0.45, 0, 0.3]];
  const productModels = productAnchors.map((position, index) => {
    const group = new THREE.Group();
    group.name = `craft-product-model-${index + 1}`;
    group.position.set(...position);
    products.add(group);
    return group;
  });
  // Keep the character, planter and trophy as separate models so each can travel between stable table anchors.
  const character = context.batch();
  character.cylinder('charcoal', 0.115, 0.14, [0, 0.07, 0], undefined, 0.08, 6);
  character.ball('charcoal', 0.11, [0, 0.25, 0]);
  character.box('yellow', [0.025, 0.025, 0.015], [-0.04, 0.268, 0.105]);
  character.box('yellow', [0.025, 0.025, 0.015], [0.04, 0.268, 0.105]);
  character.cylinder('charcoal', 0.04, 0.09, [-0.06, 0.35, 0], undefined, 0, 4);
  character.cylinder('charcoal', 0.04, 0.09, [0.06, 0.35, 0], undefined, 0, 4);
  productHits.push(...character.compileColored(productModels[0], 'craft-custom-character'));
  const planter = context.batch();
  planter.cylinder('sage', 0.11, 0.18, [0, 0.09, 0], undefined, 0.14, 6);
  planter.cylinder('sage', 0.085, 0.12, [0, 0.23, 0], undefined, 0.065, 6);
  productHits.push(...planter.compileColored(productModels[1], 'craft-printed-planter'));
  const trophy = context.batch();
  trophy.ball('ivory', 0.09, [0, 0.09, 0]);
  trophy.cylinder('yellow', 0.06, 0.1, [0, 0.22, 0], undefined, 0.03, 6);
  productHits.push(...trophy.compileColored(productModels[2], 'craft-miniature-trophy'));
  context.register('products', products, [0, 0.27, 0.3], productHits);

  const tools = context.batch();
  tools.box('charcoal', [1.05, 0.84, 0.045], [0, 0, 0]);
  tools.box('ivory', [0.96, 0.76, 0.027], [0, 0, 0.028]);
  for (let column = 0; column < 5; column++) {
    for (let row = 0; row < 3; row++) {
      tools.box('charcoal', [0.03, 0.03, 0.012], [-0.33 + column * 0.165, -0.23 + row * 0.23, 0.051]);
    }
  }
  tools.beam('metal', [-0.32, 0.2, 0.071], [-0.32, -0.18, 0.071], 0.025);
  tools.box('yellow', [0.08, 0.16, 0.055], [-0.32, -0.16, 0.08]);
  tools.box('metal', [0.22, 0.055, 0.055], [-0.02, 0.2, 0.075]);
  tools.beam('yellow', [-0.02, 0.18, 0.075], [-0.02, -0.17, 0.075], 0.04);
  tools.beam('metal', [0.25, 0.23, 0.07], [0.18, -0.12, 0.07], 0.022);
  tools.beam('metal', [0.2, 0.23, 0.07], [0.28, -0.12, 0.07], 0.022);
  tools.box('yellow', [0.08, 0.12, 0.042], [0.18, -0.16, 0.078]);
  tools.box('yellow', [0.08, 0.12, 0.042], [0.28, -0.16, 0.078]);
  tools.beam('black', [0.3, 0.17, 0.066], [0.355, 0.01, 0.066], 0.018);
  tools.beam('black', [0.355, 0.01, 0.066], [0.3, -0.23, 0.066], 0.018);
  tools.beam('black', [0.3, -0.23, 0.066], [0.26, -0.09, 0.066], 0.018);
  furniture.append(tools, 0, [-1.19, 1.92, 0.18]);
  const rightTools = context.batch();
  rightTools.box('charcoal', [1.05, 0.84, 0.045], [0, 0, 0]);
  rightTools.box('ivory', [0.96, 0.76, 0.026], [0, 0, 0.028]);
  for (const x of [-0.25, -0.08, 0.09, 0.26]) {
    rightTools.box('charcoal', [0.026, 0.025, 0.012], [x, 0.19, 0.051]);
  }
  rightTools.beam('metal', [-0.24, 0.13, 0.075], [-0.13, -0.16, 0.075], 0.025);
  rightTools.box('yellow', [0.11, 0.08, 0.047], [-0.14, -0.18, 0.08]);
  rightTools.beam('metal', [0.07, 0.22, 0.08], [0.07, -0.19, 0.08], 0.022);
  rightTools.box('charcoal', [0.16, 0.045, 0.05], [0.07, -0.09, 0.09]);
  rightTools.beam('yellow', [0.25, 0.12, 0.08], [0.17, -0.19, 0.08], 0.027);
  // Pliers, hex keys, scraper and wrench sit on the same pegboard as the hooks.
  rightTools.beam('metal', [-0.36, 0.14, 0.08], [-0.3, -0.17, 0.08], 0.018);
  rightTools.beam('metal', [-0.29, 0.14, 0.08], [-0.35, -0.17, 0.08], 0.018);
  rightTools.box('yellow', [0.055, 0.1, 0.04], [-0.35, -0.21, 0.08]);
  for (const x of [-0.01, 0.03, 0.07]) {
    rightTools.beam('charcoal', [x, 0.04, 0.078], [x, -0.22, 0.078], 0.012);
    rightTools.beam('charcoal', [x, -0.22, 0.078], [x + 0.035, -0.22, 0.078], 0.012);
  }
  rightTools.box('metal', [0.19, 0.035, 0.045], [0.31, -0.22, 0.083]);
  rightTools.beam('metal', [0.37, 0.2, 0.08], [0.37, -0.08, 0.08], 0.023);
  rightTools.beam('metal', [0.32, 0.2, 0.08], [0.37, 0.13, 0.08], 0.018);
  rightTools.beam('metal', [0.42, 0.2, 0.08], [0.37, 0.13, 0.08], 0.018);
  for (const x of [-0.38, -0.19, 0, 0.19, 0.38]) {
    for (const y of [-0.3, -0.05, 0.3]) rightTools.box('charcoal', [0.011, 0.011, 0.012], [x, y, 0.052]);
  }
  furniture.append(rightTools, 0, [1.19, 1.92, 0.18]);

  let paintingStartedAt = 0;
  let paintingWasActive = false;
  let filamentStartedAt = 0;
  let filamentWasActive = false;
  let productsStartedAt = 0;
  let productsWereActive = false;
  let lastDesignScreenLevel = Number.NaN;
  const lastSpoolOffsets = new Float32Array(spoolPositions.length).fill(Number.NaN);
  const lastSpoolRotations = new Float32Array(spoolPositions.length).fill(Number.NaN);
  const pathPosition = new THREE.Vector3();
  const pathRotation = new THREE.Euler();
  const productOrder = [0, 1, 2];
  const productSwaps: readonly (readonly [number, number])[] = [[0, 1], [1, 2], [2, 0], [0, 1], [1, 2], [2, 0]];
  return (activity: Readonly<Record<HotspotId, number>>, time: number, reducedMotion: boolean) => {
    const wave = reducedMotion ? 0.3 : Math.sin(time * 2.6);
    printHead.position.x = activity.printer * (reducedMotion ? 0.09 : wave * 0.21);
    printBed.position.z = 0.12 + activity.printer * (reducedMotion ? 0.025 : Math.sin(time * 1.8) * 0.07);
    feedSpool.rotation.x = activity.printer * (reducedMotion ? 0.18 : Math.sin(time * 0.5) * 0.4);
    designModel.rotation.y = activity.design * (reducedMotion ? 0.22 : Math.sin(time * 0.65) * 0.65);
    const designScreenLevel = 0.86 + activity.design * 0.14;
    if (designScreenLevel !== lastDesignScreenLevel) {
      (designScreenColors.array as Float32Array).fill(designScreenLevel);
      designScreenColors.needsUpdate = true;
      lastDesignScreenLevel = designScreenLevel;
    }
    const designAccentActivity = reducedMotion ? 0 : activity.design;
    const designAccentHue = (0.12 + designAccentActivity * ((time * 0.08) % 1)) % 1;
    if (designAccentHue !== lastDesignAccentHue || designAccentActivity !== lastDesignAccentSpread) {
      const values = designAccentColors.array as Float32Array;
      for (let vertex = 0; vertex < designAccentColors.count; vertex++) {
        const segment = Math.floor(vertex / 36);
        accentColor.setHSL((designAccentHue + segment * designAccentActivity / 7) % 1, 0.86 * designAccentActivity + 0.48 * (1 - designAccentActivity), 0.76);
        values[vertex * 3] = accentColor.r;
        values[vertex * 3 + 1] = accentColor.g;
        values[vertex * 3 + 2] = accentColor.b;
      }
      designAccentColors.needsUpdate = true;
      lastDesignAccentHue = designAccentHue;
      lastDesignAccentSpread = designAccentActivity;
    }

    const paintingActive = !reducedMotion && activity.painting > 0.02;
    if (paintingActive && !paintingWasActive) paintingStartedAt = time;
    if (!paintingActive) paintingStartedAt = 0;
    paintingWasActive = paintingActive;
    const paintingElapsed = paintingActive ? (time - paintingStartedAt) % 4.8 : 0;
    const paintingSegmentDuration = 4.8 / (brushPath.length - 1);
    const paintingSegment = Math.min(brushPath.length - 2, Math.floor(paintingElapsed / paintingSegmentDuration));
    const paintingProgress = smoothStep((paintingElapsed - paintingSegment * paintingSegmentDuration) / paintingSegmentDuration);
    const fromBrushPose = brushPath[paintingSegment];
    const toBrushPose = brushPath[paintingSegment + 1];
    pathPosition.copy(fromBrushPose.position).lerp(toBrushPose.position, paintingProgress);
    pathRotation.set(
      THREE.MathUtils.lerp(fromBrushPose.rotation.x, toBrushPose.rotation.x, paintingProgress),
      THREE.MathUtils.lerp(fromBrushPose.rotation.y, toBrushPose.rotation.y, paintingProgress),
      THREE.MathUtils.lerp(fromBrushPose.rotation.z, toBrushPose.rotation.z, paintingProgress),
    );
    const brushActivity = reducedMotion ? 0 : activity.painting;
    brush.position.set(
      brushRestPosition.x + (pathPosition.x - brushRestPosition.x) * brushActivity,
      brushRestPosition.y + (pathPosition.y - brushRestPosition.y) * brushActivity,
      brushRestPosition.z + (pathPosition.z - brushRestPosition.z) * brushActivity,
    );
    brush.rotation.set(
      brushRestRotation.x + (pathRotation.x - brushRestRotation.x) * brushActivity,
      brushRestRotation.y + (pathRotation.y - brushRestRotation.y) * brushActivity,
      brushRestRotation.z + (pathRotation.z - brushRestRotation.z) * brushActivity,
    );

    const filamentActive = !reducedMotion && activity.filament > 0.02;
    if (filamentActive && !filamentWasActive) filamentStartedAt = time;
    if (!filamentActive) filamentStartedAt = 0;
    filamentWasActive = filamentActive;
    const spoolStepDuration = 0.72;
    const spoolCycleDuration = spoolStepDuration * spoolPositions.length;
    const spoolElapsed = filamentActive ? (time - filamentStartedAt) % spoolCycleDuration : 0;
    const spoolStep = Math.min(spoolPositions.length - 1, Math.floor(spoolElapsed / spoolStepDuration));
    const spoolStepProgress = (spoolElapsed - spoolStep * spoolStepDuration) / spoolStepDuration;
    let spoolTravel = 0;
    if (spoolStepProgress < 0.3) spoolTravel = 0.14 * smoothStep(spoolStepProgress / 0.3);
    else if (spoolStepProgress < 0.42) spoolTravel = 0.14;
    else if (spoolStepProgress < 0.82) spoolTravel = 0.14 * (1 - smoothStep((spoolStepProgress - 0.42) / 0.4));
    const movingSpool = spoolPositions.length - 1 - spoolStep;
    let spoolMatricesChanged = false;
    for (let index = 0; index < spoolPositions.length; index++) {
      const offset = index === movingSpool ? spoolTravel * activity.filament : 0;
      const rotation = index === movingSpool ? spoolTravel * activity.filament * 1.8 : 0;
      if (offset === lastSpoolOffsets[index] && rotation === lastSpoolRotations[index]) continue;
      setSpool(index, rotation, offset);
      lastSpoolOffsets[index] = offset;
      lastSpoolRotations[index] = rotation;
      spoolMatricesChanged = true;
    }
    if (spoolMatricesChanged) {
      cores.instanceMatrix.needsUpdate = true;
      flanges.instanceMatrix.needsUpdate = true;
    }

    const productsActive = !reducedMotion && activity.products > 0.02;
    if (productsActive && !productsWereActive) productsStartedAt = time;
    if (!productsActive) productsStartedAt = 0;
    productsWereActive = productsActive;
    const productCycleDuration = 4.5;
    const productElapsed = productsActive ? (time - productsStartedAt) % productCycleDuration : 0;
    const productStepDuration = productCycleDuration / productSwaps.length;
    const productStep = Math.min(productSwaps.length - 1, Math.floor(productElapsed / productStepDuration));
    const productProgress = (productElapsed - productStep * productStepDuration) / productStepDuration;
    productOrder[0] = 0;
    productOrder[1] = 1;
    productOrder[2] = 2;
    for (let step = 0; step < productStep; step++) {
      const [left, right] = productSwaps[step];
      const previous = productOrder[left];
      productOrder[left] = productOrder[right];
      productOrder[right] = previous;
    }
    const [leftSlot, rightSlot] = productSwaps[productStep];
    const firstMovingModel = productOrder[leftSlot];
    const secondMovingModel = productOrder[rightSlot];
    const productTravel = smoothStep(productProgress);
    const productArc = Math.sin(productProgress * Math.PI);
    const productActivity = reducedMotion ? 0 : activity.products;
    for (let modelIndex = 0; modelIndex < productModels.length; modelIndex++) {
      const currentSlot = productOrder.indexOf(modelIndex);
      let targetX = productAnchors[currentSlot][0];
      let targetY = 0;
      let targetZ = productAnchors[currentSlot][2];
      if (modelIndex === firstMovingModel || modelIndex === secondMovingModel) {
        const targetSlot = currentSlot === leftSlot ? rightSlot : leftSlot;
        targetX = THREE.MathUtils.lerp(productAnchors[currentSlot][0], productAnchors[targetSlot][0], productTravel);
        targetY = productArc * 0.075;
        targetZ += (currentSlot === leftSlot ? 1 : -1) * productArc * 0.08;
      }
      const canonical = productAnchors[modelIndex];
      productModels[modelIndex].position.set(
        canonical[0] + (targetX - canonical[0]) * productActivity,
        targetY * productActivity,
        canonical[2] + (targetZ - canonical[2]) * productActivity,
      );
    }
  };
}
