import React, { useEffect, useMemo } from 'react';
import { resolveTheme, type AppTheme, type AppSectionId, type StoryScene } from '../theme';

export type { AppTheme, AppSectionId, StoryScene } from '../theme';

export const useThemeController = (
  activeSection: AppSectionId,
  activeStoryScene: StoryScene | null,
  onThemeChange?: (theme: AppTheme) => void
): AppTheme => {
  const theme = useMemo(() => resolveTheme(activeSection, activeStoryScene), [activeSection, activeStoryScene]);

  useEffect(() => {
    onThemeChange?.(theme);
  }, [theme, onThemeChange]);

  return theme;
};

export const ThemeController: React.FC<{
  activeSection: AppSectionId;
  activeStoryScene: StoryScene | null;
  onThemeChange?: (theme: AppTheme) => void;
}> = ({ activeSection, activeStoryScene, onThemeChange }) => {
  useThemeController(activeSection, activeStoryScene, onThemeChange);
  return null;
};
