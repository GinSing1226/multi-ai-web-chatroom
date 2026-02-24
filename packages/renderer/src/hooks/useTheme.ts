/**
 * 主题管理 Hook
 */

import { useState } from 'react';

export type ThemeMode = 'light' | 'dark';

/**
 * 应用主题
 */
export function applyTheme(mode: ThemeMode): void {
  const isDark = mode === 'dark';

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // 保存到 localStorage
  localStorage.setItem('theme-mode', mode);
}

/**
 * 主题管理 Hook
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    return saved || 'light';
  });

  const changeTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode);
  };

  return {
    mode,
    currentTheme: mode,
    changeTheme
  };
}
