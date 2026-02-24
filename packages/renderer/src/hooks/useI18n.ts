/**
 * 国际化 Hook / Internationalization hook
 */

import { useSettingsStore } from '@renderer/stores/settings.store';
import { t, type Language } from '@renderer/i18n';

/**
 * 使用国际化
 */
export function useI18n() {
  const { settings } = useSettingsStore();
  const language = (settings?.language || 'zh') as Language;

  return {
    language,
    t: (key: string) => t(key, language),
  };
}
