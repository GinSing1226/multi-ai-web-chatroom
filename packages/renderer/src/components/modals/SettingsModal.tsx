/**
 * SettingsModal - 设置模态框组件
 * Settings modal component
 */

import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { useSettingsStore } from '@renderer/stores/settings.store';
import { useAiApplications } from '@renderer/stores/aiApplications.store';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { cn } from '@shared';
import { showToast } from '@renderer/components/ui/Toast';
import { getDefaultSummaryPrompt, getDefaultTitlePrompt } from '@shared/constants/prompts';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'ai' | 'smart' | 'params' | 'appearance' | 'language' | 'help';

export function SettingsModal({
  isOpen,
  onClose,
}: SettingsModalProps) {
  const { settings, loadSettings, updateSettings, resetSettings } = useSettingsStore();
  const { aiApplications, loadAiApplications, updateAiApplication } = useAiApplications();
  const { t, language } = useLanguage();
  const [localSettings, setLocalSettings] = useState(settings);
  const [activeTab, setActiveTab] = useState<TabType>('ai');

  // AI 应用设置本地状态 / Local state for AI applications settings
  const [localAiApps, setLocalAiApps] = useState(aiApplications);

  // 加载设置
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAiApplications();
    }
  }, [isOpen, loadSettings, loadAiApplications]);

  // 同步设置到本地状态
  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // 同步 AI 应用到本地状态
  useEffect(() => {
    setLocalAiApps(aiApplications);
  }, [aiApplications]);

  // 保存 AI 应用设置
  const handleSaveAiApps = async () => {
    try {
      for (const app of localAiApps) {
        await updateAiApplication(app.id, app);
      }
      showToast({ message: language === 'zh' ? 'AI 应用设置已保存' : 'AI applications saved', type: 'success' });
    } catch (error) {
      console.error('保存 AI 应用失败:', error);
      showToast({ message: language === 'zh' ? '保存失败' : 'Save failed', type: 'error' });
    }
  };

  // 切换 AI 应用启用状态
  const handleToggleApp = (appId: string) => {
    setLocalAiApps(localAiApps.map(app =>
      app.id === appId ? { ...app, isEnabled: !app.isEnabled } : app
    ));
  };

  // 更新 AI 应用超时时间
  const handleUpdateTimeout = (appId: string, timeout: number) => {
    setLocalAiApps(localAiApps.map(app =>
      app.id === appId ? { ...app, timeout } : app
    ));
  };

  // 保存智能功能设置
  const handleSaveSmartSettings = async () => {
    try {
      await updateSettings(localSettings);
      showToast({ message: language === 'zh' ? '智能功能设置已保存' : 'Smart features saved', type: 'success' });
    } catch (error) {
      console.error('保存智能功能设置失败:', error);
      showToast({ message: language === 'zh' ? '保存失败' : 'Save failed', type: 'error' });
    }
  };

  // 保存参数设置
  const handleSaveParamsSettings = async () => {
    try {
      await updateSettings(localSettings);
      showToast({ message: language === 'zh' ? '参数设置已保存' : 'Parameters saved', type: 'success' });
    } catch (error) {
      console.error('保存参数设置失败:', error);
      showToast({ message: language === 'zh' ? '保存失败' : 'Save failed', type: 'error' });
    }
  };

  // 保存外观设置
  const handleSaveAppearanceSettings = async () => {
    try {
      await updateSettings(localSettings);
      showToast({ message: language === 'zh' ? '外观设置已保存' : 'Appearance saved', type: 'success' });
    } catch (error) {
      console.error('保存外观设置失败:', error);
      showToast({ message: language === 'zh' ? '保存失败' : 'Save failed', type: 'error' });
    }
  };

  // 保存语言设置
  const handleSaveLanguageSettings = async () => {
    try {
      await updateSettings(localSettings);
      showToast({ message: language === 'zh' ? '语言设置已保存' : 'Language saved', type: 'success' });
    } catch (error) {
      console.error('保存语言设置失败:', error);
      showToast({ message: language === 'zh' ? '保存失败' : 'Save failed', type: 'error' });
    }
  };

  // 重置设置
  const handleReset = async () => {
    try {
      await resetSettings();
      loadSettings();
      showToast({ message: language === 'zh' ? '设置已重置' : 'Settings reset', type: 'success' });
    } catch (error) {
      console.error('重置设置失败:', error);
      showToast({ message: language === 'zh' ? '重置失败' : 'Reset failed', type: 'error' });
    }
  };

  const tabs = [
    { id: 'ai' as TabType, label: t('settings.tabs.ai'), icon: '🤖' },
    { id: 'smart' as TabType, label: t('settings.tabs.smart'), icon: '✨' },
    { id: 'params' as TabType, label: t('settings.tabs.params'), icon: '⚙️' },
    { id: 'appearance' as TabType, label: t('settings.tabs.appearance'), icon: '🎨' },
    { id: 'language' as TabType, label: '语言 / Language', icon: '🌏' },
    { id: 'help' as TabType, label: t('settings.tabs.help'), icon: '❓' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      size="lg"
      footer={null}
    >
      <div className="flex gap-8">
        {/* 左侧标签栏 - 固定不滚动 */}
        <div className="w-40 flex-shrink-0 flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-left transition-all',
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-text-secondary hover:bg-bg-tertiary'
              )}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 space-y-6">
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {/* 固定标题和保存按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">{t('settings.ai.title')}</h3>
                <button
                  onClick={handleSaveAiApps}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-3">
                {localAiApps.map((app) => (
                  <div
                    key={app.id}
                    className={cn(
                      'p-4 rounded-lg border bg-bg-secondary transition-all',
                      app.isEnabled ? 'border-border-secondary' : 'border-border-tertiary opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo 静态图片 */}
                      <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-bg-tertiary flex-shrink-0">
                        {app.logoType === 'image' ? (
                          <img
                            src={app.logoContent}
                            alt={app.name}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <span className="text-2xl">{app.logoContent}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={app.name}
                          onChange={(e) => setLocalAiApps(localAiApps.map(a =>
                            a.id === app.id ? { ...a, name: e.target.value } : a
                          ))}
                          className="w-full px-3 py-1.5 rounded border border-border-secondary bg-bg-primary text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          placeholder={language === 'zh' ? '应用名称' : 'App name'}
                        />
                        <p className="text-xs text-text-secondary mt-1">ID: {app.id}</p>

                        {/* 超时时间 */}
                        <div className="mt-3">
                          <label className="block text-xs text-text-secondary mb-1">
                            {language === 'zh' ? '超时时间（秒）' : 'Timeout (seconds)'}
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="600"
                            value={app.timeout || 120}
                            onChange={(e) => handleUpdateTimeout(app.id, parseInt(e.target.value) || 120)}
                            className="w-full px-3 py-1.5 rounded border border-border-secondary bg-bg-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>

                      {/* 开关按钮 */}
                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleToggleApp(app.id)}
                          className={cn(
                            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            app.isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-block h-4 w-4 transform rounded-full bg-bg-primary transition-transform shadow-sm',
                              app.isEnabled ? 'translate-x-6' : 'translate-x-1'
                            )}
                          />
                        </button>
                        <span className="text-xs text-text-secondary">
                          {app.isEnabled ? (language === 'zh' ? '已启用' : 'Enabled') : (language === 'zh' ? '已禁用' : 'Disabled')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 {language === 'zh'
                    ? '禁用的 AI 应用不会在新建会话时显示。超时时间用于等待 AI 响应的最大时长。'
                    : 'Disabled AI apps will not appear in new conversations. Timeout is the maximum wait time for AI response.'
                  }
                </p>
              </div>
            </div>
          )}

          {activeTab === 'smart' && (
            <div className="space-y-6">
              {/* 固定标题和保存按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">{t('settings.smart.title')}</h3>
                <button
                  onClick={handleSaveSmartSettings}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-6">
                {/* 总结输出 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text-primary">{t('settings.smart.summary')}</h4>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">
                      {t('settings.smart.summary.prompt')}
                    </label>
                    <textarea
                      value={localSettings?.summaryPrompt || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, summaryPrompt: e.target.value })
                      }
                      rows={4}
                      maxLength={10000}
                      className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      placeholder={t('settings.smart.summary.placeholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">
                      {t('settings.smart.summary.ai')}
                    </label>
                    <select
                      value={localSettings?.summaryAiApplication || 'deepseek'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, summaryAiApplication: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {localAiApps.filter(app => app.isEnabled).map((app) => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 自动生成会话元数据 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-text-primary">{t('settings.smart.metadata')}</h4>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">
                      {t('settings.smart.metadata.prompt')}
                    </label>
                    <textarea
                      value={localSettings?.titlePrompt || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, titlePrompt: e.target.value })
                      }
                      rows={4}
                      maxLength={10000}
                      className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                      placeholder={t('settings.smart.metadata.placeholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-2">
                      {t('settings.smart.summary.ai')}
                    </label>
                    <select
                      value={localSettings?.titleAiApplication || 'deepseek'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, titleAiApplication: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      {localAiApps.filter(app => app.isEnabled).map((app) => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'params' && (
            <div className="space-y-6">
              {/* 固定标题和保存按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">{t('settings.params.title')}</h3>
                <button
                  onClick={handleSaveParamsSettings}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-4">
                {/* 轮询间隔 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {t('settings.params.pollingInterval')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={localSettings?.pollingInterval || 2}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, pollingInterval: parseInt(e.target.value) || 2 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('settings.params.pollingInterval.desc')}</p>
                </div>

                {/* 失败重试次数 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {t('settings.params.retryCount')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={localSettings?.retryCount || 3}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, retryCount: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('settings.params.retryCount.desc')}</p>
                </div>

                {/* 重试间隔 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {t('settings.params.retryInterval')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={localSettings?.retryInterval || 5}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, retryInterval: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('settings.params.retryInterval.desc')}</p>
                </div>

                {/* 网络重连次数 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {t('settings.params.reconnectCount')}
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="20"
                    value={localSettings?.reconnectCount || 5}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, reconnectCount: parseInt(e.target.value) || 3 })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('settings.params.reconnectCount.desc')}</p>
                </div>

                {/* 用户名 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    {t('settings.params.username')}
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    value={localSettings?.username || 'User'}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, username: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border-secondary bg-bg-secondary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">{t('settings.params.username.desc')}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* 固定标题和保存按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">{t('settings.appearance.title')}</h3>
                <button
                  onClick={handleSaveAppearanceSettings}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-6">
                {/* 主题 */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    {t('settings.appearance.theme')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: t('settings.appearance.theme.light'), icon: '☀️' },
                      { value: 'dark', label: t('settings.appearance.theme.dark'), icon: '🌙' },
                      { value: 'system', label: t('settings.appearance.theme.system'), icon: '💻' },
                    ].map((theme) => (
                      <button
                        key={theme.value}
                        onClick={() =>
                          setLocalSettings({ ...localSettings, theme: theme.value as any })
                        }
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                          localSettings?.theme === theme.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-border-secondary hover:border-blue-300'
                        )}
                      >
                        <span className="text-2xl">{theme.icon}</span>
                        <span className="text-sm font-medium">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              {/* 固定标题和保存按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">
                  语言 / Language
                </h3>
                <button
                  onClick={handleSaveLanguageSettings}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-4">
                <div className="p-4 rounded-lg border border-border-secondary bg-bg-secondary">
                  <label className="block text-sm font-medium text-text-primary mb-3">
                    选择界面语言 / Select Interface Language
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'zh' as const, label: '简体中文', icon: '🇨🇳' },
                      { value: 'en' as const, label: 'English', icon: '🇺🇸' },
                    ].map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          // 🔥 当切换语言时，如果提示词是默认值，则自动更新为新语言的默认值
                          // 🔥 When switching language, if prompts are default values, auto-update to new language's defaults
                          const newSettings = { ...localSettings, language: lang.value };

                          // 检查总结提示词是否为当前语言的默认值 / Check if summary prompt is current language's default
                          const currentSummaryDefault = getDefaultSummaryPrompt(localSettings?.language || 'zh');
                          if (localSettings?.summaryPrompt === currentSummaryDefault) {
                            newSettings.summaryPrompt = getDefaultSummaryPrompt(lang.value);
                          }

                          // 检查标题提示词是否为当前语言的默认值 / Check if title prompt is current language's default
                          const currentTitleDefault = getDefaultTitlePrompt(localSettings?.language || 'zh');
                          if (localSettings?.titlePrompt === currentTitleDefault) {
                            newSettings.titlePrompt = getDefaultTitlePrompt(lang.value);
                          }

                          setLocalSettings(newSettings);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                          localSettings?.language === lang.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-border-secondary hover:border-blue-300'
                        )}
                      >
                        <span className="text-3xl">{lang.icon}</span>
                        <span className="text-sm font-medium">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'help' && (
            <div className="space-y-6">
              {/* 固定标题和重置按钮 */}
              <div className="sticky top-0 z-10 flex items-center justify-between pb-4 bg-bg-primary border-b border-border-secondary">
                <h3 className="text-lg font-semibold text-text-primary">{t('settings.help.title')}</h3>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-bg-tertiary text-text-secondary text-sm font-medium transition-colors"
                >
                  {language === 'zh' ? '重置所有设置' : 'Reset All'}
                </button>
              </div>

              {/* 可滚动内容 */}
              <div className="overflow-y-auto max-h-[50vh] pr-2 space-y-4">
                <div className="p-4 rounded-lg border border-border-secondary bg-bg-secondary">
                  <h4 className="text-sm font-medium text-text-primary mb-2">{t('settings.help.version')}</h4>
                  <p className="text-xs text-text-secondary">
                    {t('settings.help.version.text')}
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-border-secondary bg-bg-secondary">
                  <h4 className="text-sm font-medium text-text-primary mb-2">{t('settings.help.docs')}</h4>
                  <a
                    href="https://github.com/your-repo/wiki"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('settings.help.docs.link')}
                  </a>
                </div>

                <div className="p-4 rounded-lg border border-border-secondary bg-bg-secondary">
                  <h4 className="text-sm font-medium text-text-primary mb-2">{t('settings.help.feedback')}</h4>
                  <p className="text-xs text-text-secondary mb-2">
                    {t('settings.help.feedback.desc')}
                  </p>
                  <a
                    href="https://github.com/your-repo/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('settings.help.feedback.link')}
                  </a>
                </div>

                <div className="p-4 rounded-lg border border-border-secondary bg-bg-secondary">
                  <h4 className="text-sm font-medium text-text-primary mb-2">{t('settings.help.license')}</h4>
                  <p className="text-xs text-text-secondary">
                    {t('settings.help.license.text')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
