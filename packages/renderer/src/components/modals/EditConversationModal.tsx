/**
 * EditConversationModal - 编辑会话模态框组件
 * Edit conversation modal component
 */

import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { cn } from '@shared';

export interface EditConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (conversationName: string, description: string) => Promise<void>;
  initialName: string;
  initialDescription: string;
}

export function EditConversationModal({
  isOpen,
  onClose,
  onSave,
  initialName,
  initialDescription,
}: EditConversationModalProps) {
  const [conversationName, setConversationName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  // 重置表单状态
  useEffect(() => {
    if (isOpen) {
      setConversationName(initialName);
      setDescription(initialDescription);
      setIsSaving(false);
    }
  }, [isOpen, initialName, initialDescription]);

  // 处理保存
  const handleSave = async () => {
    if (!conversationName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(conversationName.trim(), description.trim());
      // 成功后会自动关闭模态框（由父组件处理）
    } catch (error) {
      console.error('保存会话失败:', error);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑会话"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!conversationName.trim() || isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 会话标题 / Conversation name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            会话标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={conversationName}
            onChange={(e) => setConversationName(e.target.value)}
            placeholder="请输入会话标题"
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            disabled={isSaving}
          />
        </div>

        {/* 会话描述 / Conversation description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            会话描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请输入会话描述（可选）"
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
            disabled={isSaving}
          />
          <p className="mt-1 text-xs text-text-tertiary">
            描述将显示在会话列表中
          </p>
        </div>
      </div>
    </Modal>
  );
}
