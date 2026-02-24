/**
 * 主题管理 Hook
 */

import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 获取系统主题
 */
export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * 应用主题
 */
export function applyTheme(mode: ThemeMode): void {
  const isDark = mode === 'system' ? getSystemTheme() : mode === 'dark';

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

  // 保存到 localStorage
  localStorage.setItem('theme-mode', mode);
}

/**
 * 监听系统主题变化
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };

  mediaQuery.addEventListener('change', handler);

  // 返回清理函数
  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * 主题管理 Hook
 */
export function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode') as ThemeMode;
    return saved || 'system';
  });

  // 当前实际应用的主题
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (mode === 'system') {
      return getSystemTheme();
    }
    return mode;
  });

  // 监听系统主题变化（仅在 system 模式下）
  useEffect(() => {
    if (mode !== 'system') return;

    const cleanup = watchSystemTheme((theme) => {
      setCurrentTheme(theme);
    });

    return cleanup;
  }, [mode]);

  const changeTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    applyTheme(newMode);

    // 立即更新当前主题
    if (newMode === 'system') {
      setCurrentTheme(getSystemTheme());
    } else {
      setCurrentTheme(newMode);
    }
  };

  return {
    mode,
    currentTheme,
    changeTheme
  };
}
