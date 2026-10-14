import * as THREE from 'three';
import { buildDiorama } from './diorama';
import { HERO_CAMERA, createHeroCameraPoses, fitHeroCameraFrames, introCameraProgress, introSpinRotation } from './heroCamera';
import { HERO_TIMING, HOTSPOTS, WORKSPACES, type HotspotId, type ProjectedHotspot, type Workspace } from './heroConfig';

export interface HeroSceneController {
  setWorkspace(workspace: Workspace): void;
  setInteractive(enabled: boolean): void;
  setActiveHotspot(id: HotspotId | null): void;
  dispose(): void;
  getStats(): { triangles: number; calls: number; materials: number };
}

interface HeroSceneOptions {
  reducedMotion: boolean;
  onReady: () => void;
  onSettled: () => void;
  onTransitionEnd: () => void;
  onFallback: () => void;
  onHover: (id: HotspotId | null) => void;
  project: (points: ProjectedHotspot[]) => void;
  logos: { studioLogo: string; craftLogo: string };
}

const PARALLAX_DISTANCE = 0.1;
const easeInOutCubic = (value: number) => value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;

/** One demand-driven scheduler owns animation, projection, and rendering. */
export function createHeroScene(host: HTMLElement, options: HeroSceneOptions): HeroSceneController {
  let renderer: THREE.WebGLRenderer | null = null;
  let diorama: ReturnType<typeof buildDiorama> | null = null;
  let disposed = false;
  let failed = false;
  let ready = false;
  let settled = false;
  let inViewport = true;
  let frame: number | null = null;
  let previousTime = 0;
  let elapsed = 0;
  let introElapsed = 0;
  let transitionElapsed = 0;
  let transitioning = false;
  let workspace: Workspace = 'studio';
  let queuedWorkspace: Workspace | null = null;
  let rotationFrom = 0;
  let rotationTo = 0;
  let width = 1;
  let height = 1;
  let viewWidth = 12;
  let viewHeight = 10;
  let desktop = window.innerWidth >= 768;
  let compositionOffset = 0;
  let renderedFrames = 0;
  let diagnosticAccessor: (() => object) | null = null;
  let materialCount = 0;
  let activeHotspot: HotspotId | null = null;
  let pointerHotspot: HotspotId | null = null;
  let pointerInside = false;
  let interactive = false;
  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-6, 6, 5, -5, 0.1, 80);
  const cameraPoses = createHeroCameraPoses();
  let cameraFrames = fitHeroCameraFrames(1.6, { minX: -4, maxX: 4, minY: -3.3, maxY: 1.45 }, HERO_CAMERA.footprintRadius, desktop);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const targetParallax = new THREE.Vector2();
  const parallax = new THREE.Vector2();
  const projectedPosition = new THREE.Vector3();
  const pointInCamera = new THREE.Vector3();
  const worldVertex = new THREE.Vector3();
  const boundsMatrix = new THREE.Matrix4();
  const instanceMatrix = new THREE.Matrix4();
  const screenRight = new THREE.Vector3();
  const screenUp = new THREE.Vector3();
  const hits: THREE.Intersection[] = [];
  const hitIds = new WeakMap<THREE.Object3D, HotspotId>();
  const hitObjects: Record<Workspace, THREE.Object3D[]> = { studio: [], craft: [] };
  const hotspotWorkspace = new Map(HOTSPOTS.map(({ id, workspace: room }) => [id, room]));
  const projections: ProjectedHotspot[] = HOTSPOTS.map(({ id }) => ({ id, x: 0, y: 0, visible: false }));
  const pointerMedia = window.matchMedia('(pointer: fine) and (hover: hover)');

  function canRender() {
    return !disposed && !failed && ready && inViewport && !document.hidden;
  }

  function requestRender() {
    if (canRender() && frame === null) frame = window.requestAnimationFrame(renderFrame);
  }

  function pause() {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    previousTime = 0;
  }

  function clearProjections() {
    for (const projection of projections) projection.visible = false;
    options.project(projections);
  }

  function disposeScene() {
    pause();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    host.removeEventListener('pointerdown', onPointerDown);
    pointerMedia.removeEventListener('change', onPointerCapabilityChange);
    renderer?.domElement.removeEventListener('webglcontextlost', onContextLost);
    diorama?.dispose();
    diorama = null;
    scene.traverse(object => {
      if (object instanceof THREE.DirectionalLight || object instanceof THREE.SpotLight || object instanceof THREE.PointLight) object.shadow.dispose();
    });
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
    renderer = null;
    const diagnosticHost = host as HTMLElement & { __heroDiagnostics?: () => object };
    if (diagnosticHost.__heroDiagnostics === diagnosticAccessor) delete diagnosticHost.__heroDiagnostics;
    diagnosticAccessor = null;
    scene.clear();
  }

  function fallback() {
    if (disposed || failed) return;
    failed = true;
    clearProjections();
    disposeScene();
    options.onFallback();
  }

  function onContextLost(event: Event) {
    event.preventDefault();
    fallback();
  }

  function onVisibilityChange() {
    if (document.hidden) pause();
    else requestRender();
  }

  function onPointerCapabilityChange() {
    pointerInside = false;
    targetParallax.set(0, 0);
    requestRender();
  }

  function emitHover(id: HotspotId | null) {
    if (pointerHotspot === id) return;
    pointerHotspot = id;
    options.onHover(id);
  }

  function isDOMControl(event: PointerEvent) {
    return event.target instanceof Element && Boolean(event.target.closest('button, a, [data-hero-hotspot]'));
  }

  function pointerCoordinates(event: PointerEvent) {
    const rect = host.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    return !desktop || (pointer.x + 1) / 2 >= HERO_CAMERA.interactionStart;
  }

  function hitTest(): HotspotId | null {
    if (!settled || !interactive || transitioning || !diorama) return null;
    scene.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    hits.length = 0;
    raycaster.intersectObjects(hitObjects[workspace], true, hits);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        const id = hitIds.get(object);
        if (id && hotspotWorkspace.get(id) === workspace) return id;
        object = object.parent;
      }
    }
    return null;
  }

  function onPointerMove(event: PointerEvent) {
    if (!settled || !interactive || transitioning || event.pointerType === 'touch' || isDOMControl(event)) return;
    if (!pointerCoordinates(event)) {
      onPointerLeave();
      return;
    }
    emitHover(hitTest());
    if (!options.reducedMotion && pointerMedia.matches) {
      pointerInside = true;
      const regionStart = desktop ? HERO_CAMERA.interactionStart : 0;
      const regionX = (((pointer.x + 1) / 2 - regionStart) / (1 - regionStart)) * 2 - 1;
      targetParallax.set(regionX * PARALLAX_DISTANCE, pointer.y * PARALLAX_DISTANCE * 0.65);
      requestRender();
    }
  }

  function onPointerLeave() {
    pointerInside = false;
    targetParallax.set(0, 0);
    emitHover(null);
    requestRender();
  }

  function onPointerDown(event: PointerEvent) {
    if (!settled || !interactive || transitioning || isDOMControl(event)) return;
    const id = pointerCoordinates(event) ? hitTest() : null;
    pointerHotspot = id;
    options.onHover(id);
  }

  function setCamera(progress: number) {
    camera.position.lerpVectors(cameraPoses.topPosition, cameraPoses.frontPosition, progress);
    camera.quaternion.slerpQuaternions(cameraPoses.topQuaternion, cameraPoses.frontQuaternion, progress);
    camera.up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    camera.zoom = 1;
    viewWidth = THREE.MathUtils.lerp(cameraFrames.top.width, cameraFrames.front.width, progress);
    viewHeight = THREE.MathUtils.lerp(cameraFrames.top.height, cameraFrames.front.height, progress);
    const centerX = THREE.MathUtils.lerp(cameraFrames.top.centerX, cameraFrames.front.centerX, progress);
    const centerY = THREE.MathUtils.lerp(cameraFrames.top.centerY, cameraFrames.front.centerY, progress);
    camera.left = centerX - viewWidth / 2;
    camera.right = centerX + viewWidth / 2;
    camera.top = centerY + viewHeight / 2;
    camera.bottom = centerY - viewHeight / 2;
    compositionOffset = desktop ? viewWidth * (HERO_CAMERA.desktopCenter - 0.5) * progress : 0;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // These vectors translate the whole room in the image plane without orbiting it.
    screenRight.setFromMatrixColumn(camera.matrixWorld, 0);
    screenUp.setFromMatrixColumn(camera.matrixWorld, 1);
  }

  function resize() {
    if (!renderer || !diorama || disposed || failed) return;
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const aspect = width / height;

    desktop = window.innerWidth >= 768;
    // Fit the active halves themselves. A combined box includes empty wedges and rear-room height.
    const previousPosition = diorama.root.position.clone();
    const previousRotation = diorama.root.rotation.y;
    diorama.root.position.set(0, 0, 0);
    diorama.root.rotation.y = 0;
    camera.position.copy(cameraPoses.frontPosition);
    camera.quaternion.copy(cameraPoses.frontQuaternion);
    camera.updateMatrixWorld();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let radius = HERO_CAMERA.footprintRadius;
    for (const rotation of [WORKSPACES.studio.rotation, WORKSPACES.craft.rotation]) {
      diorama.root.rotation.y = rotation;
      diorama.root.updateMatrixWorld(true);
      diorama.root.traverse(object => {
        if (!(object instanceof THREE.Mesh) || !object.visible) return;
        const positions = object.geometry.getAttribute('position');
        if (!positions) return;
        const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
        for (let instance = 0; instance < instances; instance += 1) {
          boundsMatrix.copy(object.matrixWorld);
          if (object instanceof THREE.InstancedMesh) {
            object.getMatrixAt(instance, instanceMatrix);
            boundsMatrix.multiply(instanceMatrix);
          }
          for (let vertex = 0; vertex < positions.count; vertex += 1) {
            worldVertex.fromBufferAttribute(positions, vertex).applyMatrix4(boundsMatrix);
            radius = Math.max(radius, Math.hypot(worldVertex.x, worldVertex.z));
            if (worldVertex.z < -0.12) continue;
            pointInCamera.copy(worldVertex).applyMatrix4(camera.matrixWorldInverse);
            minX = Math.min(minX, pointInCamera.x);
            maxX = Math.max(maxX, pointInCamera.x);
            minY = Math.min(minY, pointInCamera.y);
            maxY = Math.max(maxY, pointInCamera.y);
          }
        }
      });
    }
    diorama.root.position.copy(previousPosition);
    diorama.root.rotation.y = previousRotation;
    cameraFrames = fitHeroCameraFrames(aspect, { minX, maxX, minY, maxY }, radius, desktop);
    setCamera(settled ? 1 : introCameraProgress(introElapsed, HERO_TIMING.intro));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(width, height, false);
    requestRender();
  }

  function projectHotspots() {
    if (!diorama) return;
    for (const projection of projections) {
      const hotspot = diorama.hotspots.get(projection.id);
      projection.visible = false;
      if (!hotspot || !settled || !interactive || transitioning || hotspotWorkspace.get(projection.id) !== workspace) continue;
      hotspot.anchor.getWorldPosition(projectedPosition);
      projectedPosition.project(camera);
      projection.x = (projectedPosition.x * 0.5 + 0.5) * width;
      projection.y = (-projectedPosition.y * 0.5 + 0.5) * height;
      projection.visible = projectedPosition.z > -1 && projectedPosition.z < 1 &&
        projection.x >= 0 && projection.x <= width && projection.y >= 0 && projection.y <= height;
    }
    options.project(projections);
  }

  function renderFrame(timestamp: number) {
    frame = null;
    if (!canRender() || !renderer || !diorama) return;
    const frameElapsed = previousTime ? (timestamp - previousTime) / 1000 : 0;
    const delta = Math.min(frameElapsed, 0.05);
    previousTime = timestamp;
    elapsed += frameElapsed;
    let needsAnotherFrame = false;

    try {
      if (!settled) {
        introElapsed += frameElapsed * 1000;
        const progress = options.reducedMotion ? 1 : Math.min(1, introElapsed / HERO_TIMING.intro);
        setCamera(options.reducedMotion ? 1 : introCameraProgress(introElapsed, HERO_TIMING.intro));
        diorama.root.rotation.y = options.reducedMotion ? WORKSPACES.studio.rotation : introSpinRotation(introElapsed);
        diorama.root.position.copy(screenRight).multiplyScalar(compositionOffset);
        if (progress >= 1) {
          diorama.root.rotation.y = WORKSPACES.studio.rotation;
          settled = true;
          options.onSettled();
          if (queuedWorkspace) {
            const nextWorkspace = queuedWorkspace;
            queuedWorkspace = null;
            controller.setWorkspace(nextWorkspace);
          }
        } else needsAnotherFrame = true;
      } else if (transitioning) {
        transitionElapsed += frameElapsed * 1000;
        const duration = options.reducedMotion ? HERO_TIMING.reducedRotation : HERO_TIMING.rotation;
        const progress = Math.min(1, transitionElapsed / duration);
        diorama.root.rotation.y = THREE.MathUtils.lerp(rotationFrom, rotationTo, easeInOutCubic(progress));
        if (progress >= 1) {
          diorama.root.rotation.y = rotationTo;
          transitioning = false;
          options.onTransitionEnd();
        } else needsAnotherFrame = true;
      }

      if (settled) {
        if (!pointerInside || !interactive || transitioning || options.reducedMotion) targetParallax.set(0, 0);
        const damping = 1 - Math.exp(-delta * 9);
        parallax.lerp(targetParallax, damping);
        const moving = parallax.distanceToSquared(targetParallax) > 0.000002;
        if (!moving) parallax.copy(targetParallax);
        diorama.root.position.copy(screenRight).multiplyScalar(compositionOffset + parallax.x).addScaledVector(screenUp, parallax.y);
        needsAnotherFrame = needsAnotherFrame || moving;
      }

      needsAnotherFrame = diorama.update(transitioning ? null : activeHotspot, elapsed, delta, options.reducedMotion) || needsAnotherFrame;
      renderer.render(scene, camera);
      renderedFrames += 1;
      projectHotspots();
      if (needsAnotherFrame) requestRender();
      else previousTime = 0;
    } catch {
      fallback();
    }
  }

  const controller: HeroSceneController = {
    setWorkspace(nextWorkspace) {
      if (disposed || failed || transitioning || !diorama) return;
      if (!settled) {
        queuedWorkspace = nextWorkspace;
        return;
      }
      queuedWorkspace = null;
      if (nextWorkspace === workspace) return;
      activeHotspot = null;
      pointerInside = false;
      targetParallax.set(0, 0);
      emitHover(null);
      workspace = nextWorkspace;
      rotationFrom = diorama.root.rotation.y;
      rotationTo = WORKSPACES[nextWorkspace].rotation;
      transitionElapsed = 0;
      transitioning = true;
      clearProjections();
      requestRender();
    },
    setActiveHotspot(id) {
      if (disposed || failed || !settled || !interactive || transitioning || (id && hotspotWorkspace.get(id) !== workspace)) return;
      if (activeHotspot === id) return;
      activeHotspot = id;
      requestRender();
    },
    setInteractive(enabled) {
      if (disposed || failed || interactive === enabled) return;
      interactive = enabled;
      if (!enabled) {
        activeHotspot = null;
        pointerInside = false;
        targetParallax.set(0, 0);
        emitHover(null);
      }
      requestRender();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disposeScene();
    },
    getStats() {
      return {
        triangles: renderer?.info.render.triangles ?? 0,
        calls: renderer?.info.render.calls ?? 0,
        materials: materialCount,
      };
    },
  };

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'default' });
    if (!context) {
      queueMicrotask(fallback);
      return controller;
    }
    renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true, antialias: true, powerPreference: 'default' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfff4dd, 0x373743, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffe7be, 3.3);
    keyLight.position.set(-5, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 35;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.025;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe0e6ff, 1.3);
    fillLight.position.set(6, 7, -6);
    scene.add(fillLight);

    diorama = buildDiorama({ ...options.logos, invalidate: requestRender });
    scene.add(diorama.root);
    const materials = new Set<THREE.Material>();
    diorama.root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        if (Array.isArray(object.material)) for (const material of object.material) materials.add(material);
        else materials.add(object.material);
      }
    });
    materialCount = materials.size;
    for (const { id, workspace: room } of HOTSPOTS) {
      const hotspot = diorama.hotspots.get(id);
      if (!hotspot) continue;
      for (const object of hotspot.hitObjects) {
        hitObjects[room].push(object);
        object.traverse(child => hitIds.set(child, id));
      }
    }

    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerleave', onPointerLeave, { passive: true });
    host.addEventListener('pointerdown', onPointerDown, { passive: true });
    pointerMedia.addEventListener('change', onPointerCapabilityChange);
    document.addEventListener('visibilitychange', onVisibilityChange);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    intersectionObserver = new IntersectionObserver(entries => {
      inViewport = entries[0]?.isIntersecting ?? false;
      if (inViewport) requestRender();
      else pause();
    }, { threshold: 0.01 });
    intersectionObserver.observe(host);
    ready = true;
    resize();
    if (import.meta.env.DEV) {
      diagnosticAccessor = () => {
        const forward = camera.getWorldDirection(new THREE.Vector3());
        const diagnosticVertex = new THREE.Vector3();
        const diagnosticMatrix = new THREE.Matrix4();
        const diagnosticInstance = new THREE.Matrix4();
        const projectedBounds = (floorOnly: boolean, activeOnly: boolean) => {
          let minX = Infinity;
          let maxX = -Infinity;
          let minY = Infinity;
          let maxY = -Infinity;
          diorama?.root.updateMatrixWorld(true);
          diorama?.root.traverse(object => {
            if (!(object instanceof THREE.Mesh) || !object.visible || (floorOnly && !object.name.endsWith('-floor'))) return;
            const positions = object.geometry.getAttribute('position');
            if (!positions) return;
            const instances = object instanceof THREE.InstancedMesh ? object.count : 1;
            for (let instance = 0; instance < instances; instance += 1) {
              diagnosticMatrix.copy(object.matrixWorld);
              if (object instanceof THREE.InstancedMesh) {
                object.getMatrixAt(instance, diagnosticInstance);
                diagnosticMatrix.multiply(diagnosticInstance);
              }
              for (let vertex = 0; vertex < positions.count; vertex += 1) {
                diagnosticVertex.fromBufferAttribute(positions, vertex).applyMatrix4(diagnosticMatrix);
                if (activeOnly && diorama && diagnosticVertex.z < diorama.root.position.z - 0.12) continue;
                diagnosticVertex.project(camera);
                const x = (diagnosticVertex.x * 0.5 + 0.5) * width;
                const y = (-diagnosticVertex.y * 0.5 + 0.5) * height;
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
              }
            }
          });
          return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        };
        const wallPoints = [-2, 2].map(x => {
          diagnosticVertex.set(x, 2.8, workspace === 'studio' ? 0.08 : -0.08);
          if (diorama) diagnosticVertex.applyMatrix4(diorama.root.matrixWorld);
          diagnosticVertex.project(camera);
          return [(diagnosticVertex.x * 0.5 + 0.5) * width, (-diagnosticVertex.y * 0.5 + 0.5) * height];
        }).sort((left, right) => left[0] - right[0]);
        return {
          phase: transitioning ? 'workspaceTransition' : settled ? 'settled' : introElapsed <= HERO_CAMERA.spinDuration ? 'topDown' : 'cameraTransition',
          orthographic: camera.isOrthographicCamera,
          topDownAngleDeg: THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(-forward.y, -1, 1))),
          cameraPosition: camera.position.toArray(),
          cameraForward: forward.toArray(),
          rootRotation: diorama?.root.rotation.y ?? 0,
          frames: renderedFrames,
          floorBounds: projectedBounds(true, false),
          activeRoomBounds: projectedBounds(false, true),
          middleWall: { left: wallPoints[0], right: wallPoints[1] },
          projections: projections.map(point => ({ ...point })),
          interactionRegion: { x: desktop ? width * HERO_CAMERA.interactionStart : 0, width: desktop ? width * (1 - HERO_CAMERA.interactionStart) : width },
        };
      };
      (host as HTMLElement & { __heroDiagnostics?: () => object }).__heroDiagnostics = diagnosticAccessor;
    }
    options.onReady();
    requestRender();
  } catch {
    // Report only after the consumer has received its controller, including Strict Mode cleanup.
    queueMicrotask(fallback);
  }

  return controller;
}
