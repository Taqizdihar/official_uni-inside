import * as THREE from 'three';
import { HOTSPOTS, type HotspotId } from './heroConfig';
import { GeometryBatch, type Point, type RoomMaterial, type RoomBuilderContext } from './roomGeometry';
import { buildStudioRoom } from './studioRoom';
import { buildCraftRoom } from './craftRoom';

export interface DioramaHotspot {
  anchor: THREE.Object3D;
  hitObjects: THREE.Object3D[];
}

export interface Diorama {
  root: THREE.Group;
  hotspots: Map<HotspotId, DioramaHotspot>;
  update(activeId: HotspotId | null, time: number, delta: number, reducedMotion: boolean): boolean;
  dispose(): void;
}

interface DioramaOptions {
  studioLogo: string;
  craftLogo: string;
  invalidate(): void;
}

const PALETTE: Record<RoomMaterial, string> = {
  floor: '#d9d0b8', wall: '#e7e1ce', ivory: '#f5edd5', charcoal: '#373b3c',
  metal: '#737b7c', black: '#171c20', yellow: '#f8ca35', screen: '#579d9e',
  coral: '#c66b55', sage: '#9aab88',
  kraftLight: '#c99c68', kraft: '#ad7947', kraftDark: '#755032', tape: '#e4cea8',
};

export function buildDiorama({ studioLogo, craftLogo, invalidate }: DioramaOptions): Diorama {
  const root = new THREE.Group();
  root.name = 'Uni-Inside diorama';
  const hotspots = new Map<HotspotId, DioramaHotspot>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  const ownedMaterials = new Set<THREE.Material>();
  const logoMaterials: THREE.MeshStandardMaterial[] = [];
  let disposed = false;
  const materials = Object.fromEntries(Object.entries(PALETTE).map(([key, color]) => [key,
    new THREE.MeshStandardMaterial({
      color, roughness: key === 'metal' ? 0.67 : 0.9, metalness: key === 'metal' ? 0.12 : 0,
      flatShading: true, vertexColors: true,
      emissive: key === 'screen' ? '#386e72' : '#000000', emissiveIntensity: key === 'screen' ? 0.3 : 0,
    }),
  ])) as Record<RoomMaterial, THREE.MeshStandardMaterial>;
  const ownMaterial = (material: THREE.Material) => { ownedMaterials.add(material); };
  const batch = () => new GeometryBatch(materials, geometries);
  const structural = batch();

  function register(id: HotspotId, group: THREE.Group, offset: Point, hitObjects: THREE.Object3D[]) {
    const anchor = new THREE.Object3D();
    anchor.name = `anchor-${id}`;
    anchor.position.set(...offset);
    group.add(anchor);
    hitObjects.forEach((object) => { object.userData.hotspotId = id; });
    hotspots.set(id, { anchor, hitObjects });
  }

  function walls(fixed: GeometryBatch) {
    // Preserve each interior face and add only a modest outer lip for occlusion.
    const length = Math.sqrt(8);
    const thickness = 0.42;
    const outward = (thickness - 0.13) / (2 * Math.SQRT2);
    fixed.box('wall', [length, 2.8, thickness], [-2.95 - outward, 1.4, 1.05 - outward], [0, Math.PI / 4, 0]);
    fixed.box('wall', [length, 2.8, thickness], [2.95 + outward, 1.4, 1.05 - outward], [0, -Math.PI / 4, 0]);
  }

  function logo(room: THREE.Group, url: string, aspect: number) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometries.add(geometry);
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff', transparent: true, alphaTest: 0.02, roughness: 1, depthWrite: false,
    });
    logoMaterials.push(material);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${room.name}-official-logo`;
    mesh.position.set(0, 2.09, 0.097);
    mesh.scale.set(1.19 * aspect, 1.19, 1);
    room.add(mesh);
    const texture = new THREE.TextureLoader().load(url, (loaded) => {
      if (disposed) { loaded.dispose(); return; }
      const image = loaded.image as { width?: number; height?: number } | undefined;
      if (image?.width && image.height) mesh.scale.x = 1.19 * image.width / image.height;
      invalidate();
    }, undefined, () => { if (!disposed) invalidate(); });
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 1;
    material.map = texture;
    textures.add(texture);
  }

  const studio = new THREE.Group();
  studio.name = 'StudioRoom';
  root.add(studio);
  const studioStatic = batch();
  studioStatic.floor();
  walls(studioStatic);
  // Both rooms share one central, double-faced wall rather than overlapping walls.
  structural.box('wall', [4, 2.8, 0.16], [0, 1.4, 0]);
  logo(studio, studioLogo, 1);
  const studioContext: RoomBuilderContext = { room: studio, static: studioStatic, materials, ownMaterial, resources: geometries, batch, register };
  const animateStudio = buildStudioRoom(studioContext);

  const craft = new THREE.Group();
  craft.name = 'CraftRoom';
  craft.rotation.y = Math.PI;
  root.add(craft);
  const craftStatic = batch();
  craftStatic.floor();
  walls(craftStatic);
  logo(craft, craftLogo, 1034 / 1160);
  const craftContext: RoomBuilderContext = { room: craft, static: craftStatic, materials, ownMaterial, resources: geometries, batch, register };
  const animateCraft = buildCraftRoom(craftContext);
  structural.compile(root, 'shared-wall');
  studioStatic.compile(studio, 'studio-static');
  craftStatic.compile(craft, 'craft-static');

  const activity = Object.fromEntries(HOTSPOTS.map(({ id }) => [id, 0])) as Record<HotspotId, number>;
  const ids = HOTSPOTS.map(({ id }) => id);
  animateStudio(activity, 0, false);
  animateCraft(activity, 0, false);

  return {
    root, hotspots,
    update(activeId, time, delta, reducedMotion) {
      if (disposed) return false;
      let resetting = false;
      for (const id of ids) {
        const target = !reducedMotion && id === activeId ? 1 : 0;
        let next = reducedMotion ? 0 : THREE.MathUtils.damp(activity[id], target, 12, Math.min(Math.max(delta, 0), 0.05));
        if (Math.abs(next - target) < 0.0001) next = target;
        activity[id] = next;
        resetting ||= next !== target;
      }
      animateStudio(activity, time, reducedMotion);
      animateCraft(activity, time, reducedMotion);
      return !reducedMotion && (activeId !== null || resetting);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.traverse((object) => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
      geometries.forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      logoMaterials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      root.clear();
      hotspots.clear();
    },
  };
}
