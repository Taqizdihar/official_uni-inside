export type Workspace = 'studio' | 'craft';

export type HotspotId =
  | 'camera' | 'drone' | 'editing' | 'lighting' | 'microphone'
  | 'printer' | 'filament' | 'design' | 'painting' | 'products';

export interface ProjectedHotspot {
  id: HotspotId;
  x: number;
  y: number;
  visible: boolean;
}

export const HERO_COPY = {
  title: 'Ideas captured and made tangible',
  description: 'From visual storytelling to physical creation, every idea is shaped with purpose.',
} as const;

export const TRUST_SIGNALS = [
  { value: '10', plus: true, label: 'PROJECTS' },
  { value: '250', plus: true, label: 'PRODUCTS SOLD' },
  { value: '12', plus: false, label: 'COLLABORATORS' },
] as const;

export const HOTSPOTS: readonly { id: HotspotId; workspace: Workspace; object: string; label: string }[] = [
  { id: 'camera', workspace: 'studio', object: 'Camera', label: '50+ SHOOTING HOURS' },
  { id: 'drone', workspace: 'studio', object: 'Drone', label: '15+ SHOOTING HOURS' },
  { id: 'editing', workspace: 'studio', object: 'Editing monitor', label: '8+ HOURS OF FOOTAGE EDITED' },
  { id: 'lighting', workspace: 'studio', object: 'Studio light', label: 'CONTROLLED STUDIO LIGHTING' },
  { id: 'microphone', workspace: 'studio', object: 'Microphone', label: 'CLEAN AUDIO CAPTURE' },
  { id: 'printer', workspace: 'craft', object: '3D printer', label: '2000+ PRINT HOURS' },
  { id: 'filament', workspace: 'craft', object: 'Filament rack and spools', label: '15+ FILAMENT SPOOLS USED' },
  { id: 'design', workspace: 'craft', object: 'Design monitor', label: '50+ MODELS DESIGNED' },
  { id: 'painting', workspace: 'craft', object: 'Painting table', label: 'QUALITY HAND-PAINTED FINISH' },
  { id: 'products', workspace: 'craft', object: 'Product shelf', label: 'READY-MADE & CUSTOM PRODUCTS' },
];

export const WORKSPACES = {
  studio: { name: 'Uni-Inside Studio', rotation: 0, primary: 'Start a Project', secondary: 'View Projects' },
  craft: { name: 'Uni-Inside Craft', rotation: Math.PI, primary: 'Shop Products', secondary: 'Custom Request' },
} as const;

export const HERO_TIMING = {
  intro: 2200,
  content: 340,
  roll: 1050,
  stagger: 140,
  rotation: 850,
  reducedRotation: 160,
} as const;
