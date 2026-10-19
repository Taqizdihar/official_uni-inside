import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { HotspotId } from './heroConfig';

export type Point = readonly [number, number, number];
export type Size = readonly [number, number, number];
export type RoomMaterial = 'floor' | 'wall' | 'ivory' | 'charcoal' | 'metal' | 'black' | 'yellow' | 'screen' | 'coral' | 'sage' | 'kraftLight' | 'kraft' | 'kraftDark' | 'tape';
export interface RoomBuilderContext {
  room: THREE.Group;
  static: GeometryBatch;
  materials: Record<RoomMaterial, THREE.MeshStandardMaterial>;
  ownMaterial(material: THREE.Material): void;
  resources: Set<THREE.BufferGeometry>;
  batch(): GeometryBatch;
  register(id: HotspotId, group: THREE.Group, offset: Point, hitObjects: THREE.Object3D[]): void;
}
export type RoomAnimation = (activity: Readonly<Record<HotspotId, number>>, time: number, reducedMotion: boolean) => void;

// Each opposing hexagon meets only at its four-unit back edge. In particular,
// neither platform covers the removed lateral triangles around (±3, 0).
export const ROOM_FOOTPRINT: readonly (readonly [number, number])[] = [
  [-2, 0], [2, 0], [4, 2], [2, 4], [-2, 4], [-4, 2],
];

/** Open eight-sided collars reveal the camera lens instead of covering its face. */
export function focusRing(outer: number, inner: number, depth: number) {
  const shape = new THREE.Shape();
  const hole = new THREE.Path();
  for (let index = 0; index < 8; index++) {
    const angle = index * Math.PI / 4;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    if (index === 0) {
      shape.moveTo(x * outer, y * outer);
      hole.moveTo(x * inner, -y * inner);
    } else {
      shape.lineTo(x * outer, y * outer);
      hole.lineTo(x * inner, -y * inner);
    }
  }
  shape.closePath();
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

/** A tapered shell gives the softbox its photographic silhouette with only twelve triangles. */
export function softboxShell(width: number, height: number, depth: number) {
  const x = width / 2;
  const y = height / 2;
  const rearX = width * 0.23;
  const rearY = height * 0.23;
  const z = depth / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -x, -y, z, x, -y, z, x, y, z, -x, y, z,
    -rearX, -rearY, -z, rearX, -rearY, -z, rearX, rearY, -z, -rearX, rearY, -z,
  ], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3, 5, 4, 7, 5, 7, 6,
    4, 0, 3, 4, 3, 7, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7, 4, 5, 1, 4, 1, 0]);
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

export class GeometryBatch {
  private readonly parts = new Map<RoomMaterial, THREE.BufferGeometry[]>();

  constructor(private readonly materials: Record<RoomMaterial, THREE.MeshStandardMaterial>, private readonly resources: Set<THREE.BufferGeometry>) {}

  add(geometry: THREE.BufferGeometry, material: RoomMaterial, position: Point = [0, 0, 0], rotation: Point = [0, 0, 0]) {
    let part = geometry;
    if (geometry.index) {
      part = geometry.toNonIndexed();
      geometry.dispose();
    }
    part.deleteAttribute('uv');
    if (!part.getAttribute('color')) {
      const colors = new Float32Array(part.getAttribute('position').count * 3).fill(1);
      part.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const transform = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    );
    part.applyMatrix4(transform);
    const list = this.parts.get(material) ?? [];
    list.push(part);
    this.parts.set(material, list);
  }

  box(material: RoomMaterial, size: Size, position: Point, rotation?: Point) {
    this.add(new THREE.BoxGeometry(...size), material, position, rotation);
  }

  cylinder(material: RoomMaterial, radius: number, height: number, position: Point, rotation?: Point, topRadius = radius, segments = 8) {
    this.add(new THREE.CylinderGeometry(topRadius, radius, height, segments, 1), material, position, rotation);
  }

  ball(material: RoomMaterial, radius: number, position: Point) {
    this.add(new THREE.IcosahedronGeometry(radius, 0), material, position);
  }

  beam(material: RoomMaterial, from: Point, to: Point, width: number, depth = width) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const geometry = new THREE.BoxGeometry(width, direction.length(), depth);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    geometry.translate(...start.add(end).multiplyScalar(0.5).toArray());
    this.add(geometry, material);
  }

  floor() {
    const outline = new THREE.Shape();
    ROOM_FOOTPRINT.forEach(([x, z], index) => index ? outline.lineTo(x, -z) : outline.moveTo(x, -z));
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.18, bevelEnabled: false, steps: 1, curveSegments: 1 });
    this.add(geometry, 'floor', [0, -0.18, 0], [-Math.PI / 2, 0, 0]);
  }

  append(batch: GeometryBatch, rotationY = 0, position: Point = [0, 0, 0]) {
    const transform = new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY), new THREE.Vector3(1, 1, 1));
    for (const [key, parts] of batch.parts) {
      const list = this.parts.get(key) ?? [];
      parts.forEach((part) => part.applyMatrix4(transform));
      list.push(...parts);
      this.parts.set(key, list);
    }
    batch.parts.clear();
  }

  /** One shared material can retain the palette through per-vertex linear colors. */
  compileColored(parent: THREE.Object3D, prefix: string) {
    const parts: THREE.BufferGeometry[] = [];
    const baseColor = this.materials.ivory.color;
    let castsShadow = false;
    for (const [key, geometries] of this.parts) {
      // Emissive screens retain their separate material and are compiled below.
      if (key === 'screen') continue;
      const color = this.materials[key].color;
      const red = color.r / Math.max(baseColor.r, 0.001);
      const green = color.g / Math.max(baseColor.g, 0.001);
      const blue = color.b / Math.max(baseColor.b, 0.001);
      for (const geometry of geometries) {
        const count = geometry.getAttribute('position').count;
        const colors = new Float32Array(count * 3);
        for (let index = 0; index < count; index++) {
          colors[index * 3] = red;
          colors[index * 3 + 1] = green;
          colors[index * 3 + 2] = blue;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        parts.push(geometry);
      }
      castsShadow ||= key === 'wall' || key === 'charcoal' || key === 'black' || key.startsWith('kraft');
      this.parts.delete(key);
    }
    const meshes: THREE.Mesh[] = [];
    if (parts.length) {
      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!merged) throw new Error(`Cannot merge colored hero geometry: ${prefix}`);
      merged.computeBoundingSphere();
      this.resources.add(merged);
      const mesh = new THREE.Mesh(merged, this.materials.ivory);
      mesh.name = `${prefix}-palette`;
      mesh.castShadow = castsShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      meshes.push(mesh);
    }
    meshes.push(...this.compile(parent, prefix));
    return meshes;
  }

  compile(parent: THREE.Object3D, prefix: string) {
    const meshes: THREE.Mesh[] = [];
    for (const [key, parts] of this.parts) {
      const merged = mergeGeometries(parts, false);
      parts.forEach((part) => part.dispose());
      if (!merged) throw new Error(`Cannot merge hero geometry: ${prefix}/${key}`);
      merged.computeBoundingSphere();
      this.resources.add(merged);
      const mesh = new THREE.Mesh(merged, this.materials[key]);
      mesh.name = `${prefix}-${key}`;
      mesh.castShadow = key === 'wall' || key === 'charcoal' || key === 'black';
      mesh.receiveShadow = key !== 'screen';
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.parts.clear();
    return meshes;
  }
}
