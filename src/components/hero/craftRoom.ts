import * as THREE from 'three';
import type { HotspotId } from './heroConfig';
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

  // The desks track the angled walls; the finishing station remains separate.
  const printerBench: Point = [2.65, 0, 1.4];
  const designDesk: Point = [-2.55, 0, 1.3];
  table(printerBench[0], printerBench[2], 1.8, 0.95, 'yellow', -Math.PI / 4);
  const printerStorage = context.batch();
  printerStorage.box('charcoal', [0.46, 0.81, 0.62], [0.5, 0.435, 0]);
  for (const y of [0.26, 0.49, 0.72]) {
    printerStorage.box('black', [0.4, 0.012, 0.016], [0.5, y, 0.318]);
    printerStorage.box('metal', [0.13, 0.02, 0.025], [0.5, y + 0.065, 0.332]);
  }
  printerStorage.box('charcoal', [0.39, 0.29, 0.5], [-0.55, 0.18, -0.03]);
  printerStorage.box('metal', [0.14, 0.025, 0.03], [-0.55, 0.333, 0.23]);
  furniture.append(printerStorage, -Math.PI / 4, printerBench);
  table(designDesk[0], designDesk[2], 1.4, 0.84, 'ivory', Math.PI / 4);
  table(0, 0.85, 1.63, 0.76, 'yellow');
  const designChair = context.batch();
  designChair.box('yellow', [0.49, 0.09, 0.43], [0, 0.53, 1.03]);
  designChair.box('charcoal', [0.49, 0.5, 0.09], [0, 0.82, 1.23], [-0.1, 0, 0]);
  designChair.box('yellow', [0.34, 0.24, 0.045], [0, 0.91, 1.285], [-0.1, 0, 0]);
  designChair.cylinder('metal', 0.045, 0.48, [0, 0.25, 1.03]);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    designChair.beam('metal', [0, 0.08, 1.03], [Math.cos(angle) * 0.26, 0.06, 1.03 + Math.sin(angle) * 0.26], 0.045);
  }
  furniture.append(designChair, Math.PI / 4, designDesk);

  const printer = object('printer', [printerBench[0], 1.055, printerBench[2]], -Math.PI / 4);
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
  furniture.append(printerBody, -Math.PI / 4, [printerBench[0], 1.055, printerBench[2]]);
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

  const design = object('design', [designDesk[0], 1.055, designDesk[2]], Math.PI / 4);
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
  furniture.append(monitor, Math.PI / 4, [designDesk[0], 1.055, designDesk[2]]);
  const designScreen = context.batch();
  designScreen.box('screen', [0.86, 0.48, 0.012], [0, 0.48, 0.045]);
  const designHits: THREE.Object3D[] = designScreen.compile(design, 'craft-design-screen');
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

  const filament = object('filament', [1.2, 0, 0.8], -Math.PI / 4);
  const rack = context.batch();
  for (const x of [-0.28, 0.28]) {
    rack.box('charcoal', [0.05, 2.25, 0.055], [x, 1.125, -0.13]);
  }
  for (const height of [0.4, 1.04, 1.68, 2.28]) {
    rack.box('charcoal', [0.62, 0.052, 0.34], [0, height, 0]);
  }
  rack.box('yellow', [0.62, 0.035, 0.055], [0, 2.305, 0.16]);
  furniture.append(rack, -Math.PI / 4, [1.2, 0, 0.8]);
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
  const cores = new THREE.InstancedMesh(spoolCoreGeometry, materials.ivory, 6);
  const flanges = new THREE.InstancedMesh(spoolFlangeGeometry, materials.charcoal, 12);
  cores.name = 'craft-filament-cores';
  flanges.name = 'craft-filament-flanges';
  for (const mesh of [cores, flanges]) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    filament.add(mesh);
    filamentHits.push(mesh);
  }
  const spoolPositions: Point[] = [
    [0, 0.61, 0], [0, 1.25, 0], [0, 1.89, 0],
    [0, 0.1, 0.07], [0, 0.28, 0.07], [0, 0.2, 0.39],
  ];
  const spoolColors = ['#e5ae34', '#252a2d', '#e7e4d9', '#e5ae34', '#e7e4d9', '#252a2d'];
  const spoolAxis = new THREE.Vector3();
  function setSpool(index: number, rotation: number) {
    const position = spoolPositions[index];
    moving.position.set(...position);
    moving.rotation.set(index < 3 || index === 5 ? Math.PI / 2 : 0, rotation, 0);
    moving.updateMatrix();
    cores.setMatrixAt(index, moving.matrix);
    spoolAxis.set(0, 1, 0).applyQuaternion(moving.quaternion);
    for (let side = 0; side < 2; side++) {
      moving.position.set(...position).addScaledVector(spoolAxis, side ? 0.085 : -0.085);
      moving.updateMatrix();
      flanges.setMatrixAt(index * 2 + side, moving.matrix);
    }
  }
  for (let index = 0; index < spoolPositions.length; index++) {
    setSpool(index, 0);
    cores.setColorAt(index, new THREE.Color(spoolColors[index]));
  }
  cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flanges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const mesh of [cores, flanges]) {
    mesh.computeBoundingSphere();
  }
  context.register('filament', filament, [0, 1.89, 0.105], filamentHits);

  const products = object('products', [-2.66, 1.95, 1.0], Math.PI / 4);
  const display = context.batch();
  // One mounted display follows the angled left wall rather than filling the floor.
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
  furniture.append(display, Math.PI / 4, [-2.66, 1.95, 1.0]);
  const productHits: THREE.Object3D[] = [];
  const featuredProduct = new THREE.Group();
  featuredProduct.position.set(0.49, 0.04, 0.03);
  products.add(featuredProduct);
  const featured = context.batch();
  featured.cylinder('charcoal', 0.12, 0.17, [0, 0.085, 0], undefined, 0.095, 6);
  featured.ball('charcoal', 0.12, [0, 0.26, 0]);
  featured.box('yellow', [0.03, 0.03, 0.015], [-0.05, 0.278, 0.111]);
  featured.box('yellow', [0.03, 0.03, 0.015], [0.05, 0.278, 0.111]);
  featured.box('ivory', [0.055, 0.023, 0.02], [0, 0.242, 0.113]);
  featured.cylinder('charcoal', 0.043, 0.1, [-0.075, 0.36, 0], undefined, 0, 4);
  featured.cylinder('charcoal', 0.043, 0.1, [0.075, 0.36, 0], undefined, 0, 4);
  productHits.push(...featured.compileColored(featuredProduct, 'craft-custom-character'));
  context.register('products', featuredProduct, [0, 0.26, 0.135], productHits);

  const tools = context.batch();
  tools.box('charcoal', [0.88, 0.7, 0.045], [0, 0, 0]);
  tools.box('ivory', [0.8, 0.62, 0.027], [0, 0, 0.028]);
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
  furniture.append(tools, -Math.PI / 4, [3.36, 2, 1.6]);

  let lastSpoolRotation = Number.NaN;
  return (activity: Readonly<Record<HotspotId, number>>, time: number, reducedMotion: boolean) => {
    const wave = reducedMotion ? 0.3 : Math.sin(time * 2.6);
    printHead.position.x = activity.printer * (reducedMotion ? 0.09 : wave * 0.21);
    printBed.position.z = 0.12 + activity.printer * (reducedMotion ? 0.025 : Math.sin(time * 1.8) * 0.07);
    feedSpool.rotation.x = activity.printer * (reducedMotion ? 0.18 : Math.sin(time * 0.5) * 0.4);
    designModel.rotation.y = activity.design * (reducedMotion ? 0.22 : Math.sin(time * 0.65) * 0.65);
    brush.position.y = 0.13 + activity.painting * (reducedMotion ? 0.035 : 0.045 + wave * 0.035);
    brush.rotation.z = -0.48 + activity.painting * (reducedMotion ? 0.08 : wave * 0.16);
    featuredProduct.position.y = 0.04 + activity.products * (reducedMotion ? 0.025 : 0.035 + Math.sin(time * 2) * 0.025);
    featuredProduct.rotation.y = activity.products * (reducedMotion ? 0.14 : Math.sin(time * 1.7) * 0.32);
    const spoolRotation = activity.filament * (reducedMotion ? 0.18 : Math.sin(time * 0.72) * 0.4);
    if (spoolRotation !== lastSpoolRotation) {
      setSpool(2, spoolRotation);
      cores.instanceMatrix.needsUpdate = true;
      flanges.instanceMatrix.needsUpdate = true;
      lastSpoolRotation = spoolRotation;
    }
  };
}
