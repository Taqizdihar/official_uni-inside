import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { buildDiorama } from './diorama';
import { HOTSPOTS, type HotspotId } from './heroConfig';

async function createDiorama() {
  const originalLoad = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = function (_url, onLoad) {
    const texture = new THREE.Texture<HTMLImageElement>();
    texture.image = { width: 512, height: 256 } as HTMLImageElement;
    queueMicrotask(() => onLoad?.(texture));
    return texture;
  };
  try {
    const diorama = buildDiorama({ studioLogo: 'studio.png', craftLogo: 'craft.png', invalidate: () => {} });
    await Promise.resolve();
    diorama.update(null, 0, 0, false);
    diorama.root.updateMatrixWorld(true);
    return diorama;
  } finally {
    THREE.TextureLoader.prototype.load = originalLoad;
  }
}

function floorMeshes(root: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof THREE.Mesh && object.name.endsWith('-floor')) meshes.push(object);
  });
  assert.ok(meshes.length > 0, 'the scene must contain actual platform geometry');
  return meshes;
}

function topSurfaceArea(meshes: readonly THREE.Mesh[]) {
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();
  let area = 0;
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute('position');
    const index = mesh.geometry.index;
    const count = index?.count ?? positions.count;
    for (let vertex = 0; vertex < count; vertex += 3) {
      a.fromBufferAttribute(positions, index ? index.getX(vertex) : vertex).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(positions, index ? index.getX(vertex + 1) : vertex + 1).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(positions, index ? index.getX(vertex + 2) : vertex + 2).applyMatrix4(mesh.matrixWorld);
      cross.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      if (cross.y > 0.00001 && Math.abs(cross.x) < 0.00001 && Math.abs(cross.z) < 0.00001) area += cross.length() / 2;
    }
  }
  return area;
}

function hotspotGroup(anchor: THREE.Object3D, id: HotspotId) {
  let object: THREE.Object3D | null = anchor;
  while (object && object.name !== `hotspot-${id}`) object = object.parent;
  assert.ok(object, `${id} must have an independently animated group`);
  return object;
}

function snapshot(group: THREE.Object3D, includeMaterials = true, excludeName?: string) {
  const values: number[] = [];
  group.traverse((object) => {
    if (object.name === excludeName) return;
    values.push(...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray());
    if (object instanceof THREE.InstancedMesh) values.push(...object.instanceMatrix.array);
    if (!includeMaterials || !(object instanceof THREE.Mesh)) return;
    const colors = object.geometry.getAttribute('color');
    if (colors) values.push(...colors.array);
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      values.push(material.opacity);
      if (material instanceof THREE.MeshStandardMaterial) {
        values.push(...material.color.toArray(), ...material.emissive.toArray(), material.emissiveIntensity);
      } else if (material instanceof THREE.MeshBasicMaterial) {
        values.push(...material.color.toArray());
      }
    }
  });
  return values;
}

function largestDifference(first: readonly number[], second: readonly number[]) {
  assert.equal(first.length, second.length, 'animations must not rebuild the object hierarchy');
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference = Math.max(difference, Math.abs(first[index] - second[index]));
  return difference;
}

test('both physical platform surfaces exclude the removed wedges', async () => {
  const diorama = await createDiorama();
  try {
    const floors = floorMeshes(diorama.root);
    assert.ok(Math.abs(topSurfaceArea(floors) - 48) < 0.00001, 'the two platforms must have area 48, rather than the complete octagon area 56');
    const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));
    for (const z of [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]) {
      const x = (2 + Math.abs(z) + 4) / 2;
      for (const side of [-1, 1]) {
        ray.ray.origin.set(x * side, 5, z);
        assert.equal(ray.intersectObjects(floors).length, 0, `removed wedge at (${x * side}, ${z}) must have no floor or slab`);
      }
    }
    for (const z of [-3, -1, 1, 3]) {
      ray.ray.origin.set(0, 5, z);
      assert.ok(ray.intersectObjects(floors).length > 0, `workspace floor must remain at (0, ${z})`);
    }
  } finally {
    diorama.dispose();
  }
});

test('all ten objects provide distinct finite anchors and physical interaction targets', async () => {
  const diorama = await createDiorama();
  try {
    assert.equal(diorama.hotspots.size, 10);
    const positions = new Set<string>();
    const groups = new Set<THREE.Object3D>();
    for (const { id } of HOTSPOTS) {
      const hotspot = diorama.hotspots.get(id);
      assert.ok(hotspot, `${id} must exist in the rendered scene`);
      const position = hotspot.anchor.getWorldPosition(new THREE.Vector3());
      assert.ok(position.toArray().every(Number.isFinite));
      positions.add(position.toArray().map((value) => value.toFixed(4)).join(','));
      groups.add(hotspotGroup(hotspot.anchor, id));
      assert.ok(hotspot.hitObjects.length > 0, `${id} needs raycastable geometry`);
      assert.ok(hotspot.hitObjects.some((object) => object instanceof THREE.Mesh || object.children.length > 0));
    }
    assert.equal(positions.size, 10, 'each object needs its own projected anchor');
    assert.equal(groups.size, 10, 'objects must animate independently');
  } finally {
    diorama.dispose();
  }
});

test('each selected object animates alone and returns to rest after deactivation', async (context) => {
  for (const { id } of HOTSPOTS) {
    await context.test(id, async () => {
      const diorama = await createDiorama();
      try {
        const groups = new Map(HOTSPOTS.map(({ id: objectId }) => {
          const hotspot = diorama.hotspots.get(objectId);
          assert.ok(hotspot);
          return [objectId, hotspotGroup(hotspot.anchor, objectId)] as const;
        }));
        const baseline = new Map([...groups].map(([objectId, group]) => [objectId, snapshot(group)] as const));
        const restingDrone = id === 'drone' ? snapshot(groups.get('drone')!, true, 'drone-propellers') : null;
        let time = 0;
        for (let frame = 0; frame < 60; frame += 1) diorama.update(id, time += 1 / 60, 1 / 60, false);
        assert.ok(largestDifference(baseline.get(id)!, snapshot(groups.get(id)!)) > 0.0001, `${id} must respond with an object animation`);
        for (const [otherId, group] of groups) {
          if (otherId === id) continue;
          assert.ok(largestDifference(baseline.get(otherId)!, snapshot(group)) < 0.00001, `${otherId} must remain still while ${id} is active`);
        }
        let needsFrame = true;
        for (let frame = 0; frame < 300; frame += 1) needsFrame = diorama.update(null, time += 1 / 60, 1 / 60, false);
        if (id === 'drone') {
          const group = groups.get(id)!;
          assert.ok(largestDifference(restingDrone!, snapshot(group, true, 'drone-propellers')) < 0.0001, 'drone body must return to its baseline');
          const propellers = group.getObjectByName('drone-propellers') as THREE.InstancedMesh;
          const stoppedAngle = Array.from(propellers.instanceMatrix.array);
          for (let frame = 0; frame < 60; frame += 1) diorama.update(null, time += 1 / 60, 1 / 60, false);
          assert.deepEqual(Array.from(propellers.instanceMatrix.array), stoppedAngle, 'propellers must retain their stopped angle without snapping');
        } else {
          assert.ok(largestDifference(baseline.get(id)!, snapshot(groups.get(id)!)) < 0.0001, `${id} must return to its baseline`);
        }
        assert.equal(needsFrame, false, 'the demand scheduler must be able to stop when all objects rest');
      } finally {
        diorama.dispose();
      }
    });
  }
});

test('reduced motion leaves object transforms at rest for every hotspot', async () => {
  const diorama = await createDiorama();
  try {
    diorama.update(null, 0, 0, true);
    const baseline = snapshot(diorama.root, false);
    let time = 0;
    for (const { id } of HOTSPOTS) {
      for (let frame = 0; frame < 15; frame += 1) diorama.update(id, time += 1 / 60, 1 / 60, true);
      assert.ok(largestDifference(baseline, snapshot(diorama.root, false)) < 0.00001, `${id} must not move under reduced motion`);
    }
  } finally {
    diorama.dispose();
  }
});

test('the filament wave visits every shelf from top to bottom and resets without drift', async () => {
  const diorama = await createDiorama();
  try {
    const filament = hotspotGroup(diorama.hotspots.get('filament')!.anchor, 'filament');
    const cores = filament.getObjectByName('craft-filament-cores') as THREE.InstancedMesh;
    const baseline = Array.from(cores.instanceMatrix.array);
    const matrix = new THREE.Matrix4();
    const positionAt = (index: number) => {
      cores.getMatrixAt(index, matrix);
      return matrix.elements[14];
    };
    const frame = 1 / 60;
    let time = 0;
    const firstActivation = frame;
    const sampleShelf = async (shelfFromTop: number, cycle = 0) => {
      const target = firstActivation + cycle * 3.6 + shelfFromTop * 0.72 + 0.25;
      while (time + 0.0001 < target) {
        time += frame;
        diorama.update('filament', time, frame, false);
      }
      const movingIndex = 4 - shelfFromTop;
      assert.ok(positionAt(movingIndex) > 0.19, `spool ${shelfFromTop + 1} from the top must move outward`);
      for (let index = 0; index < 5; index++) {
        if (index !== movingIndex) assert.ok(Math.abs(positionAt(index) - 0.08) < 0.0001, 'the other spools must remain in their slots');
      }
    };
    for (let shelf = 0; shelf < 5; shelf++) await sampleShelf(shelf);
    await sampleShelf(0, 1); // The same top-to-bottom wave starts again after one complete cycle.
    for (let frameIndex = 0; frameIndex < 240; frameIndex++) {
      time += frame;
      diorama.update(null, time, frame, false);
    }
    assert.ok(largestDifference(baseline, Array.from(cores.instanceMatrix.array)) < 0.0001, 'all spool matrices must return to their canonical positions and rotations');
  } finally {
    diorama.dispose();
  }
});

test('the brush paints from multiple sides and product models shuffle smoothly between anchors', async () => {
  const diorama = await createDiorama();
  try {
    const brush = diorama.hotspots.get('painting')!.hitObjects[0].parent!;
    const brushRest = { position: brush.position.clone(), rotation: brush.quaternion.clone() };
    let time = 0;
    let minimumX = Number.POSITIVE_INFINITY;
    let maximumX = Number.NEGATIVE_INFINITY;
    let minimumZ = Number.POSITIVE_INFINITY;
    let maximumZ = Number.NEGATIVE_INFINITY;
    const frame = 1 / 60;
    for (let frameIndex = 0; frameIndex < 360; frameIndex++) {
      time += frame;
      diorama.update('painting', time, frame, false);
      minimumX = Math.min(minimumX, brush.position.x);
      maximumX = Math.max(maximumX, brush.position.x);
      minimumZ = Math.min(minimumZ, brush.position.z);
      maximumZ = Math.max(maximumZ, brush.position.z);
      assert.ok(brush.position.y > 0.1, 'the brush handle must stay clear of the table surface');
    }
    assert.ok(maximumX - minimumX > 0.45, 'the brush must reach both sides of the model');
    assert.ok(maximumZ - minimumZ > 0.18, 'the brush must reposition around the model in depth');
    for (let frameIndex = 0; frameIndex < 180; frameIndex++) {
      time += frame;
      diorama.update(null, time, frame, false);
    }
    assert.ok(brush.position.distanceTo(brushRest.position) < 0.0001, 'the brush must return to its canonical position');
    assert.ok(brush.quaternion.angleTo(brushRest.rotation) < 0.0001, 'the brush must return to its canonical orientation');

    const products = hotspotGroup(diorama.hotspots.get('products')!.anchor, 'products');
    const models = [0, 1, 2].map((index) => products.getObjectByName(`craft-product-model-${index + 1}`)!);
    const anchors = models.map((model) => model.position.clone());
    let maximumFrameTravel = 0;
    let previousPositions = models.map((model) => model.position.clone());
    for (let frameIndex = 0; frameIndex < 600; frameIndex++) {
      time += frame;
      diorama.update('products', time, frame, false);
      for (let index = 0; index < models.length; index++) {
        const current = models[index].position;
        maximumFrameTravel = Math.max(maximumFrameTravel, current.distanceTo(previousPositions[index]));
        assert.ok(Math.abs(current.x) < 0.7 && current.y >= 0 && current.y < 0.1, 'models must stay above the tabletop and within its width');
        assert.ok(current.z > 0.19 && current.z < 0.42, 'models must remain within the tabletop depth');
        previousPositions[index].copy(current);
      }
    }
    assert.ok(maximumFrameTravel < 0.04, 'models must move continuously without teleporting');
    for (let frameIndex = 0; frameIndex < 180; frameIndex++) {
      time += frame;
      diorama.update(null, time, frame, false);
    }
    for (let index = 0; index < models.length; index++) {
      assert.ok(models[index].position.distanceTo(anchors[index]) < 0.0001, 'each model must reset to its canonical anchor');
    }
  } finally {
    diorama.dispose();
  }
});

test('scene resources stay within the triangle budget and dispose after unmount', async () => {
  const diorama = await createDiorama();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let triangles = 0;
  diorama.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    triangles += (object.geometry.index?.count ?? object.geometry.getAttribute('position').count) / 3 *
      (object instanceof THREE.InstancedMesh ? object.count : 1);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      if ((material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) && material.map) textures.add(material.map);
    }
  });
  assert.ok(triangles > 0 && triangles <= 40_000, 'procedural geometry must stay beneath the preferred safety boundary');
  assert.equal(textures.size, 2, 'only the two official logo textures belong in the scene');
  const resources = [...geometries, ...materials, ...textures];
  const disposed = new Set<object>();
  for (const resource of resources) resource.addEventListener('dispose', () => disposed.add(resource));
  diorama.dispose();
  assert.equal(disposed.size, resources.length, 'every live geometry, material, and logo texture must be disposed');
});
