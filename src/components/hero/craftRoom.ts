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

  function table(x: number, z: number, width: number, depth: number) {
    furniture.box('ivory', [width, 0.12, depth], [x, 0.99, z]);
    furniture.box('charcoal', [width - 0.1, 0.13, 0.08], [x, 0.88, z + depth / 2 - 0.07]);
    for (const dx of [-width / 2 + 0.09, width / 2 - 0.09]) {
      for (const dz of [-depth / 2 + 0.08, depth / 2 - 0.08]) {
        furniture.box('charcoal', [0.075, 0.94, 0.075], [x + dx, 0.47, z + dz]);
      }
    }
  }

  // An offset printer bench and two distinct working surfaces leave the entry open.
  table(1.18, 2.58, 1.8, 1.0);
  table(-1.5, 1.75, 1.35, 0.85);
  table(0, 0.93, 1.63, 0.76);
  furniture.box('charcoal', [0.46, 0.09, 0.4], [-1.48, 0.53, 2.51]);
  furniture.box('charcoal', [0.46, 0.47, 0.08], [-1.48, 0.79, 2.71], [-0.1, 0, 0]);
  furniture.cylinder('metal', 0.045, 0.48, [-1.48, 0.25, 2.51]);
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    furniture.beam('metal', [-1.48, 0.08, 2.51], [-1.48 + Math.cos(angle) * 0.26, 0.06, 2.51 + Math.sin(angle) * 0.26], 0.045);
  }

  const printer = object('printer', [1.18, 1.055, 2.58]);
  const printerBody = context.batch();
  printerBody.box('black', [1.22, 0.15, 0.83], [0, 0.075, 0]);
  // The exposed gantry and forward sliding bed identify an open bed-slinger FDM printer.
  for (const x of [-0.48, 0.48]) {
    printerBody.box('charcoal', [0.095, 1.02, 0.09], [x, 0.67, -0.21]);
    printerBody.box('metal', [0.023, 0.96, 0.024], [x + 0.033, 0.66, -0.15]);
    printerBody.box('black', [0.18, 0.1, 0.27], [x, 0.2, -0.21]);
  }
  printerBody.box('charcoal', [1.04, 0.11, 0.095], [0, 1.16, -0.21]);
  printerBody.box('metal', [1.04, 0.043, 0.043], [0, 0.73, -0.145]);
  printerBody.box('charcoal', [0.048, 0.038, 0.72], [-0.17, 0.185, 0.035]);
  printerBody.box('charcoal', [0.048, 0.038, 0.72], [0.17, 0.185, 0.035]);
  printerBody.box('black', [0.22, 0.17, 0.12], [0.58, 0.19, 0.18], [-0.28, 0, 0]);
  printerBody.box('screen', [0.155, 0.098, 0.012], [0.58, 0.217, 0.245], [-0.28, 0, 0]);
  printerBody.beam('yellow', [0.37, 1.2, -0.23], [0.29, 1.3, -0.15], 0.02);
  printerBody.beam('yellow', [0.29, 1.3, -0.15], [0, 0.87, -0.11], 0.016);
  printerBody.beam('metal', [0.48, 0.99, -0.24], [0.68, 0.99, -0.24], 0.035);
  furniture.append(printerBody, 0, [1.18, 1.055, 2.58]);
  const printerHits: THREE.Object3D[] = [];

  const printBed = new THREE.Group();
  printBed.position.set(0, 0.235, 0.12);
  printer.add(printBed);
  const bed = context.batch();
  bed.box('charcoal', [0.77, 0.065, 0.69], [0, 0, 0]);
  bed.box('yellow', [0.7, 0.02, 0.62], [0, 0.041, 0]);
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
  context.register('printer', printer, [0.08, 0.94, 0.16], printerHits);

  const design = object('design', [-1.5, 1.055, 1.58]);
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
  furniture.append(monitor, 0, [-1.5, 1.055, 1.58]);
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
  context.register('design', design, [0.1, 0.63, 0.1], designHits);

  const painting = object('painting', [0, 1.055, 0.93]);
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
  finishing.box('yellow', [0.055, 0.12, 0.055], [0.1, 0.325, 0.1]);
  furniture.append(finishing, 0, [0, 1.055, 0.93]);
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
  context.register('painting', painting, [0.02, 0.26, 0.07], paintingHits);

  const filament = object('filament', [2.62, 0, 1.17]);
  const rack = context.batch();
  for (const x of [-0.43, 0.43]) {
    rack.box('charcoal', [0.05, 2.15, 0.055], [x, 1.075, -0.13]);
  }
  for (const height of [0.37, 1.0, 1.63, 2.16]) {
    rack.box('charcoal', [0.93, 0.052, 0.36], [0, height, 0]);
  }
  rack.box('yellow', [0.94, 0.035, 0.055], [0, 2.2, 0.17]);
  furniture.append(rack, 0, [2.62, 0, 1.17]);
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
  resources.add(spoolCoreGeometry);
  resources.add(spoolFlangeGeometry);
  const cores = new THREE.InstancedMesh(spoolCoreGeometry, materials.ivory, 8);
  const flanges = new THREE.InstancedMesh(spoolFlangeGeometry, materials.charcoal, 16);
  cores.name = 'craft-filament-cores';
  flanges.name = 'craft-filament-flanges';
  for (const mesh of [cores, flanges]) {
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    filament.add(mesh);
    filamentHits.push(mesh);
  }
  const spoolPositions: Point[] = [
    [-0.22, 0.58, 0], [0.22, 0.58, 0], [-0.22, 1.21, 0], [0.22, 1.21, 0],
    [-0.22, 1.84, 0], [0.22, 1.84, 0], [-0.21, 0.1, 0.08], [-0.21, 0.28, 0.08],
  ];
  const spoolColors = ['#e5ae34', '#bcc9b3', '#d48572', '#ddccac', '#dcded5', '#b7bfc3', '#e5ae34', '#ddccac'];
  const spoolAxis = new THREE.Vector3();
  function setSpool(index: number, rotation: number) {
    const position = spoolPositions[index];
    moving.position.set(...position);
    moving.rotation.set(index < 6 ? Math.PI / 2 : 0, rotation, 0);
    moving.updateMatrix();
    cores.setMatrixAt(index, moving.matrix);
    spoolAxis.set(0, 1, 0).applyQuaternion(moving.quaternion);
    for (let side = 0; side < 2; side++) {
      moving.position.set(...position).addScaledVector(spoolAxis, side ? 0.085 : -0.085);
      moving.updateMatrix();
      flanges.setMatrixAt(index * 2 + side, moving.matrix);
    }
  }
  for (let index = 0; index < 8; index++) {
    setSpool(index, 0);
    cores.setColorAt(index, new THREE.Color(spoolColors[index]));
  }
  cores.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flanges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (const mesh of [cores, flanges]) {
    mesh.computeBoundingSphere();
  }
  context.register('filament', filament, [0.21, 1.87, 0.18], filamentHits);

  const products = object('products', [-2.56, 0, 1.15], Math.PI / 4);
  const display = context.batch();
  for (const x of [-0.45, 0.45]) {
    display.box('charcoal', [0.055, 2.01, 0.06], [x, 1.005, -0.17]);
  }
  for (const height of [0.32, 0.96, 1.59, 2.02]) {
    display.box('ivory', [0.96, 0.055, 0.48], [0, height, 0]);
  }
  // A faceted planter, little character, and miniature architectural print.
  display.cylinder('sage', 0.14, 0.22, [-0.22, 0.45, 0], undefined, 0.12, 6);
  display.cylinder('black', 0.09, 0.014, [-0.22, 0.567, 0], undefined, 0.09, 6);
  display.box('sage', [0.04, 0.24, 0.045], [-0.22, 0.68, 0]);
  display.beam('sage', [-0.22, 0.65, 0], [-0.31, 0.77, 0], 0.05);
  display.beam('sage', [-0.22, 0.7, 0], [-0.14, 0.79, 0], 0.045);
  display.box('ivory', [0.24, 0.21, 0.19], [0.22, 0.45, 0]);
  display.cylinder('coral', 0.17, 0.14, [0.22, 0.625, 0], undefined, 0, 4);
  display.box('charcoal', [0.042, 0.07, 0.013], [0.22, 0.415, 0.103]);
  display.cylinder('ivory', 0.12, 0.26, [-0.23, 1.74, 0], undefined, 0.07, 6);
  display.cylinder('ivory', 0.07, 0.09, [-0.23, 1.905, 0], undefined, 0.1, 6);
  display.box('sage', [0.26, 0.18, 0.18], [0.21, 1.71, 0]);
  display.box('yellow', [0.055, 0.14, 0.02], [0.21, 1.73, 0.105]);
  furniture.append(display, Math.PI / 4, [-2.56, 0, 1.15]);
  const productHits: THREE.Object3D[] = [];
  const featuredProduct = new THREE.Group();
  featuredProduct.position.set(0.11, 0.99, 0.07);
  products.add(featuredProduct);
  const featured = context.batch();
  featured.cylinder('coral', 0.14, 0.2, [0, 0.1, 0], undefined, 0.11, 6);
  featured.ball('coral', 0.145, [0, 0.31, 0]);
  featured.box('charcoal', [0.035, 0.035, 0.015], [-0.057, 0.334, 0.134]);
  featured.box('charcoal', [0.035, 0.035, 0.015], [0.057, 0.334, 0.134]);
  featured.box('ivory', [0.08, 0.025, 0.026], [0, 0.287, 0.137]);
  featured.cylinder('yellow', 0.045, 0.14, [-0.11, 0.41, 0], undefined, 0.017, 6);
  featured.cylinder('yellow', 0.045, 0.14, [0.11, 0.41, 0], undefined, 0.017, 6);
  productHits.push(...featured.compileColored(featuredProduct, 'craft-custom-character'));
  context.register('products', products, [0.1, 1.4, 0.19], productHits);

  // A restrained geometric tool rail keeps the middle wall visually clear for its logo.
  furniture.box('charcoal', [0.52, 0.035, 0.08], [1.27, 1.55, 0.12]);
  furniture.beam('metal', [1.1, 1.48, 0.16], [1.1, 1.25, 0.16], 0.025);
  furniture.box('yellow', [0.09, 0.11, 0.045], [1.1, 1.22, 0.16]);
  furniture.beam('metal', [1.29, 1.5, 0.16], [1.35, 1.28, 0.16], 0.025);
  furniture.box('charcoal', [0.1, 0.075, 0.05], [1.36, 1.26, 0.16]);

  let lastSpoolRotation = Number.NaN;
  return (activity: Readonly<Record<HotspotId, number>>, time: number, reducedMotion: boolean) => {
    const wave = reducedMotion ? 0.3 : Math.sin(time * 2.6);
    printHead.position.x = activity.printer * (reducedMotion ? 0.09 : wave * 0.21);
    printBed.position.z = 0.12 + activity.printer * (reducedMotion ? 0.025 : Math.sin(time * 1.8) * 0.07);
    feedSpool.rotation.x = activity.printer * (reducedMotion ? 0.18 : Math.sin(time * 0.5) * 0.4);
    designModel.rotation.y = activity.design * (reducedMotion ? 0.22 : Math.sin(time * 0.65) * 0.65);
    brush.position.y = 0.13 + activity.painting * (reducedMotion ? 0.035 : 0.045 + wave * 0.035);
    brush.rotation.z = -0.48 + activity.painting * (reducedMotion ? 0.08 : wave * 0.16);
    featuredProduct.position.y = 0.99 + activity.products * (reducedMotion ? 0.025 : 0.035 + Math.sin(time * 2) * 0.025);
    featuredProduct.rotation.y = activity.products * (reducedMotion ? 0.14 : Math.sin(time * 1.7) * 0.32);
    const spoolRotation = activity.filament * (reducedMotion ? 0.18 : Math.sin(time * 0.72) * 0.4);
    if (spoolRotation !== lastSpoolRotation) {
      setSpool(5, spoolRotation);
      cores.instanceMatrix.needsUpdate = true;
      flanges.instanceMatrix.needsUpdate = true;
      lastSpoolRotation = spoolRotation;
    }
  };
}
