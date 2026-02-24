/**
 * 语言上下文 / Language context
 */

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSettingsStore } from '@renderer/stores/settings.store';
import { translations, type Language } from '@renderer/i18n';

interface LanguageContextType {
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  try {
    const { settings } = useSettingsStore();
    const language = (settings?.language || 'zh') as Language;

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key as keyof typeof translations.zh] || key;

    // 替换占位符 / Replace placeholders
    if (params) {
      Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, String(params[param]));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
  } catch (error) {
    console.error('LanguageProvider error:', error);
    // Fallback: render children anyway with default language
    return (
      <LanguageContext.Provider value={{ language: 'zh', t: (key: string) => key }}>
        {children}
      </LanguageContext.Provider>
    );
  }
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
