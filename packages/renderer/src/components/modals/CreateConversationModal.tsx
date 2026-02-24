/**
 * CreateConversationModal - 创建会话模态框组件
 * Create conversation modal component
 */

import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { AiApplicationSelector } from '@renderer/components/common/AiApplicationSelector';
import { useAiApplications } from '@renderer/stores/aiApplications.store';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { cn } from '@shared';

export interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (aiApplicationIds: string[]) => Promise<void>;
}

export function CreateConversationModal({
  isOpen,
  onClose,
  onCreate,
}: CreateConversationModalProps) {
  const { aiApplications, loadAiApplications } = useAiApplications();
  const { t } = useLanguage();
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // 加载 AI 应用列表
  useEffect(() => {
    if (isOpen && aiApplications.length === 0) {
      loadAiApplications();
    }
  }, [isOpen, aiApplications.length, loadAiApplications]);

  // 重置选择状态
  useEffect(() => {
    if (!isOpen) {
      setSelectedApps([]);
      setIsCreating(false);
    }
  }, [isOpen]);

  // 处理创建会话
  const handleCreate = async () => {
    if (selectedApps.length === 0) {
      return;
    }

    setIsCreating(true);
    try {
      await onCreate(selectedApps);
      // 成功后会自动关闭模态框（由父组件处理）
    } catch (error) {
      console.error('创建会话失败:', error);
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('chat.selectAI')}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-text-secondary">
            {t('create.selected')} <span className="font-semibold text-text-primary">{selectedApps.length}</span> {t('create.apps')}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('settings.cancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={selectedApps.length === 0 || isCreating}
              className={cn(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                selectedApps.length > 0 && !isCreating
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30'
                  : 'bg-bg-tertiary text-text-tertiary'
              )}
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('create.creating')}
                </span>
              ) : (
                t('create.confirm')
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 说明文本 */}
        <div className="p-4 rounded-lg bg-bg-secondary border border-border-secondary">
          <p className="text-sm text-text-secondary mb-2">
            {t('create.description')}
          </p>
          <p className="text-xs text-text-tertiary">
            💡 {t('create.hint')}
          </p>
        </div>

        {/* AI 应用选择器 */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            {t('create.selectAIApps')}
          </h3>
          {aiApplications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('create.loading')}
            </div>
          ) : (
            <AiApplicationSelector
              applications={aiApplications.filter(app => app.isEnabled)}
              selected={selectedApps}
              onChange={setSelectedApps}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
