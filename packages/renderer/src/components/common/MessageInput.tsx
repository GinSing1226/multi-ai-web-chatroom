/**
 * 消息输入组件
 * Message input component
 */
import { useState, useRef, KeyboardEvent } from 'react';
import { cn } from '@shared';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { useTheme } from '@renderer/hooks/useTheme';

export interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minLength?: number;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder,
  minLength = 1,
  className,
}: MessageInputProps) {
  const { t } = useLanguage();
  const { currentTheme } = useTheme();
  const finalPlaceholder = placeholder || t('chat.typeMessage');
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed.length >= minLength && !disabled) {
      onSend(trimmed);
      setMessage('');

      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送,Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // 自动调整高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  };

  const canSend = message.trim().length >= minLength && !disabled;

  return (
    <div className={cn('relative', className)}>
      {/* 输入区域容器 - 参考ChatGPT样式 */}
      {/* Input container - ChatGPT style */}
      <div className="px-4 pb-2 pt-2">
        <div className="max-w-4xl mx-auto">
          <div
            className={cn(
              'relative bg-bg-primary rounded-2xl border border-border-secondary shadow-sm transition-all duration-200',
              currentTheme === 'dark' && 'input-box-dark'
            )}
          >
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={finalPlaceholder}
              disabled={disabled}
              rows={1}
              className={cn(
                'w-full px-4 py-3 pr-24 rounded-2xl',
                'bg-transparent text-text-primary placeholder-text-tertiary',
                'resize-none overflow-hidden',
                'focus:outline-none',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200'
              )}
              style={{ maxHeight: '200px' }}
            />

            {/* 底部工具栏 */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {/* 发送按钮 */}
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  'flex items-center justify-center p-2 rounded-lg transition-all duration-200',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  canSend
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-bg-tertiary text-text-tertiary'
                )}
                title={canSend ? t('chat.send') : '请输入内容'}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* 底部提示 */}
          <div className="mt-1 text-center text-xs text-text-tertiary">
            {t('chat.sendHint')}
          </div>
        </div>
      </div>
    </div>
  );
}
