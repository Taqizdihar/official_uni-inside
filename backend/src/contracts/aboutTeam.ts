/** Pure content contracts shared by the API, CMS, and public presentation. */
export const characterCount = (value: string) => Array.from(value).length;
export type ValidationIssue = { path: string; message: string };
export type WorkspaceKey = 'studio' | 'craft';
export type PrincipleSlot = 1 | 2 | 3;
export type AboutEdit = {
  intro: { subtitle: string; description: string };
  ecosystem: { heading: string; workspaces: { key: WorkspaceKey; subtitle: string; description: string }[] };
  guides: { heading: string; principles: { slot: PrincipleSlot; heading: string; description: string }[] };
  partnersHeading: string;
};
export type AboutPreview = {
  highlight: string;
  ecosystemEyebrow: string;
  ecosystemDescription: string;
  workspaceTags: Record<WorkspaceKey, string[]>;
  visionMission: { eyebrow: string; visionHeading: string; visionDescription: string; missionHeading: string; missionPoints: string[] };
  guidesEyebrow: string;
  clients: { eyebrow: string; heading: string; description: string; types: string[] };
};
export const aboutPreviewDefaults: AboutPreview = {
  highlight: 'MULTIMEDIA • CREATIVE TECHNOLOGY • 3D PRINTING',
  ecosystemEyebrow: 'ONE ECOSYSTEM',
  ecosystemDescription: 'Different outputs, one way of working: curious, collaborative, and built around the idea.',
  workspaceTags: { studio: ['CAPTURE', 'DOCUMENT', 'EDIT', 'DELIVER'], craft: ['DESIGN', 'PRINT', 'FINISH', 'MAKE'] },
  visionMission: {
    eyebrow: 'VISION & MISSION',
    visionHeading: 'CREATIVITY AND TECHNOLOGY, MOVING TOGETHER.',
    visionDescription: 'To shape meaningful experiences where creativity and technology move together—from digital stories to physical products.',
    missionHeading: 'IDEAS DESERVE THE RIGHT FORM.',
    missionPoints: ['Collaborate across disciplines.', 'Translate ideas into thoughtful solutions.', 'Deliver visual, digital, and physical work with purpose and care.'],
  },
  guidesEyebrow: 'WHAT GUIDES US',
  clients: {
    eyebrow: 'CLIENTS & COLLABORATORS',
    heading: 'BUILT WITH PEOPLE WHO BRING DIFFERENT PROBLEMS TO THE TABLE.',
    description: 'Our collaborations span startups, university research teams, lecturers, and community organizations. Through lecturer-led research projects, we have also contributed CMS-based tools used by groups such as KWT.\n\nWhether the outcome is a video, a digital system, or a printed object, each collaboration begins with listening and choosing the right way to build.',
    types: ['STARTUPS', 'ACADEMIC & RESEARCH TEAMS', 'COMMUNITY ORGANIZATIONS'],
  },
};
export const aboutEditFallback: AboutEdit = {
  intro: {
    subtitle: 'CREATIVE BY NATURE, TECHNICAL BY DESIGN',
    description: 'We are a Bandung-based creative technology studio where visual production, digital experimentation, and 3D fabrication meet. We collaborate to turn ideas into stories, systems, and physical products with purpose.',
  },
  ecosystem: { heading: 'TWO WORKSPACES. ONE SHARED PURPOSE.', workspaces: [
    { key: 'studio', subtitle: 'VISUAL & DIGITAL SERVICES', description: 'The service workspace for photography, videography, drone documentation, editing, company profiles, research documentation, and creative digital solutions.' },
    { key: 'craft', subtitle: '3D-PRINTED PRODUCTS', description: 'The product workspace for ready-made and custom 3D-printed objects, from functional everyday pieces to character models and original designs built from scratch.' },
  ] },
  guides: { heading: 'THE WAY WE MAKE MATTERS.', principles: [
    { slot: 1, heading: 'STAY CURIOUS.', description: 'We explore tools, materials, and perspectives before deciding how an idea should take shape.' },
    { slot: 2, heading: 'BUILD TOGETHER.', description: 'The strongest outcomes come from open collaboration across disciplines, roles, and communities.' },
    { slot: 3, heading: 'MAKE IT MATTER.', description: 'Every visual, system, or product should serve a clear purpose—not exist only to look good.' },
  ] },
  partnersHeading: 'Our Partners',
};
export const initialCardTemplateUrl = 'https://canva.link/kt3du8vvev19zrk';
export const aboutTeamPendingCapabilities = {
  aboutEditorial: false, workspaceTags: false, collaboratorTypes: false, teamCardTemplate: false,
} as const;

export function textIssues(path: string, value: string, max: number, old?: string, paragraphs = false): ValidationIssue[] {
  if (!value.trim()) return [{ path, message: 'Kolom ini wajib diisi.' }];
  if (value === old) return [];
  if (characterCount(value) > max) return [{ path, message: `Maksimal ${max} karakter.` }];
  const controls=Array.from(value).some(char=>{const code=char.charCodeAt(0);return code===127||code<32&&!(paragraphs&&(code===10||code===13));});
  if (/[<>]/u.test(value) || controls) return [{ path, message: 'Gunakan teks biasa tanpa HTML.' }];
  return [];
}
export function validateAboutEdit(next: AboutEdit, old?: AboutEdit): ValidationIssue[] {
  const issues = [
    ...textIssues('intro.subtitle', next.intro.subtitle, 50, old?.intro.subtitle),
    ...textIssues('intro.description', next.intro.description, 170, old?.intro.description),
    ...textIssues('ecosystem.heading', next.ecosystem.heading, 40, old?.ecosystem.heading),
    ...textIssues('guides.heading', next.guides.heading, 20, old?.guides.heading),
    ...textIssues('partnersHeading', next.partnersHeading, 30, old?.partnersHeading),
  ];
  if (next.ecosystem.workspaces.map(item => item.key).join(',') !== 'studio,craft') issues.push({ path: 'ecosystem.workspaces', message: 'Workspace harus tetap Studio lalu Craft.' });
  else next.ecosystem.workspaces.forEach((item, index) => {
    issues.push(...textIssues(`ecosystem.workspaces.${index}.subtitle`, item.subtitle, 30, old?.ecosystem.workspaces[index]?.subtitle));
    issues.push(...textIssues(`ecosystem.workspaces.${index}.description`, item.description, 180, old?.ecosystem.workspaces[index]?.description));
  });
  if (next.guides.principles.map(item => item.slot).join(',') !== '1,2,3') issues.push({ path: 'guides.principles', message: 'Prinsip harus tetap pada tiga slot 01, 02, dan 03.' });
  else next.guides.principles.forEach((item, index) => {
    issues.push(...textIssues(`guides.principles.${index}.heading`, item.heading, 30, old?.guides.principles[index]?.heading));
    issues.push(...textIssues(`guides.principles.${index}.description`, item.description, 110, old?.guides.principles[index]?.description));
  });
  return issues;
}
export function listIssues(path: string, values: string[], maxItems: number, maxLength: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (values.length > maxItems) issues.push({ path, message: `Maksimal ${maxItems} isian.` });
  const seen = new Set<string>();
  values.forEach((value, index) => {
    issues.push(...textIssues(`${path}.${index}`, value, maxLength));
    const normalized = value.normalize('NFKC').trim().toLocaleLowerCase('id');
    if (seen.has(normalized)) issues.push({ path: `${path}.${index}`, message: 'Isian tidak boleh berulang.' });
    seen.add(normalized);
  });
  return issues;
}
export function validateAboutPreview(next: AboutPreview): ValidationIssue[] {
  const issues = [
    ...textIssues('highlight', next.highlight, 50),
    ...textIssues('ecosystemEyebrow', next.ecosystemEyebrow, 30),
    ...textIssues('ecosystemDescription', next.ecosystemDescription, 100),
    ...listIssues('workspaceTags.studio', next.workspaceTags.studio, 5, 10),
    ...listIssues('workspaceTags.craft', next.workspaceTags.craft, 5, 10),
    ...textIssues('visionMission.eyebrow', next.visionMission.eyebrow, 30),
    ...textIssues('visionMission.visionHeading', next.visionMission.visionHeading, 60),
    ...textIssues('visionMission.visionDescription', next.visionMission.visionDescription, 130),
    ...textIssues('visionMission.missionHeading', next.visionMission.missionHeading, 60),
    ...textIssues('guidesEyebrow', next.guidesEyebrow, 30),
    ...textIssues('clients.eyebrow', next.clients.eyebrow, 30),
    ...textIssues('clients.heading', next.clients.heading, 60),
    ...textIssues('clients.description', next.clients.description, 380, undefined, true),
    ...listIssues('clients.types', next.clients.types, 5, 25),
  ];
  if (next.visionMission.missionPoints.length !== 3) issues.push({ path: 'visionMission.missionPoints', message: 'Misi harus memiliki tepat tiga poin.' });
  next.visionMission.missionPoints.forEach((point, index) => issues.push(...textIssues(`visionMission.missionPoints.${index}`, point, 70)));
  return issues;
}
export function safeExternalUrl(value: string, httpsOnly = true): boolean {
  if (!value || characterCount(value) > 1000 || value !== value.trim() || /\s|\\/u.test(value) || !/^https?:\/\//i.test(value)) return false;
  try { const url = new URL(value); return (httpsOnly ? url.protocol === 'https:' : ['https:', 'http:'].includes(url.protocol)) && !url.username && !url.password && Boolean(url.hostname); } catch { return false; }
}
export const memberSocialColumns = ['linkedin_url', 'instagram_url', 'x_url', 'github_url'] as const;
export type MemberSocialColumn = typeof memberSocialColumns[number];
const profileDomains: Record<MemberSocialColumn, string[]> = {
  linkedin_url: ['linkedin.com'], instagram_url: ['instagram.com'], x_url: ['x.com', 'twitter.com'], github_url: ['github.com'],
};
export function safeMemberProfile(value: string, column: MemberSocialColumn): boolean {
  if (!safeExternalUrl(value)) return false;
  const url = new URL(value);
  return !url.port && profileDomains[column].some(host => url.hostname === host || url.hostname === `www.${host}`) && url.pathname.replace(/\//g, '').length > 0
    && !/^\/(?:login|signin|redirect|away|accounts)(?:\/|$)/i.test(url.pathname)
    && !['url', 'redirect', 'redirect_uri', 'next', 'target'].some(key => url.searchParams.has(key));
}
export function canManageTemplate(roleCode: string): boolean { return ['super_admin', 'administrator'].includes(roleCode); }

export type CollectionStatus = 'draft' | 'published' | 'archived';
export type TeamMemberInput = { full_name: string; role_title: string; short_bio: string; photo_media_id: number; status: CollectionStatus } & Record<MemberSocialColumn, string | null>;
export type PartnerInput = { name: string; logo_media_id: number; website_url: string | null; status: CollectionStatus };
export function validateTeamMember(input: TeamMemberInput): ValidationIssue[] {
  const issues = [...textIssues('full_name', input.full_name, 150), ...textIssues('role_title', input.role_title, 190), ...textIssues('short_bio', input.short_bio, 1000, undefined, true)];
  if (!Number.isSafeInteger(input.photo_media_id) || input.photo_media_id <= 0) issues.push({ path: 'photo_media_id', message: 'Pilih foto kartu dari Manajemen Aset.' });
  for (const column of memberSocialColumns) if (input[column] !== null && !safeMemberProfile(input[column]!, column)) issues.push({ path: column, message: 'Gunakan URL profil HTTPS resmi untuk platform ini.' });
  return issues;
}
export function validatePartner(input: PartnerInput): ValidationIssue[] {
  const issues = textIssues('name', input.name, 150);
  if (!Number.isSafeInteger(input.logo_media_id) || input.logo_media_id <= 0) issues.push({ path: 'logo_media_id', message: 'Pilih logo dari Manajemen Aset.' });
  if (input.website_url !== null && !safeExternalUrl(input.website_url, false)) issues.push({ path: 'website_url', message: 'Gunakan URL HTTP(S) tanpa kredensial.' });
  return issues;
}
