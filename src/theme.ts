export type AppTheme = 'light' | 'dark';
export type AppSectionId = 'hero' | 'about' | 'team' | 'products' | 'services' | 'events' | 'achievements' | 'contact';
export type StoryScene = 'PRODUCTS' | 'SERVICES' | 'EVENTS';

const SECTION_THEME_MAP: Record<AppSectionId, AppTheme> = {
  hero: 'dark',
  about: 'light',
  team: 'dark',
  products: 'light',
  services: 'dark',
  events: 'light',
  achievements: 'dark',
  contact: 'light',
};

const STORY_THEME_MAP: Record<StoryScene, AppTheme> = {
  PRODUCTS: 'light',
  SERVICES: 'dark',
  EVENTS: 'light',
};

export const resolveTheme = (
  activeSection: AppSectionId | null | undefined,
  activeStoryScene: StoryScene | null | undefined
): AppTheme => {
  if (activeStoryScene) {
    return STORY_THEME_MAP[activeStoryScene];
  }

  return SECTION_THEME_MAP[activeSection ?? 'hero'];
};
