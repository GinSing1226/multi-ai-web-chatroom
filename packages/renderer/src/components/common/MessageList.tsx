/**
 * 消息展示组件
 * 支持横排/竖排切换，支持分页
 * Message display component with horizontal/vertical mode and pagination support
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { Message, AiApplicationBinding, Chat, AiApplication, cn, areAllAiOutputsComplete } from '@shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Loading, InlineLoading } from '@renderer/components/ui/Loading';
import { useLanguage } from '@renderer/contexts/LanguageContext';

export type DisplayMode = 'horizontal' | 'vertical';

export interface MessageListProps {
  chat: Chat;
  aiBindings: AiApplicationBinding[];
  aiApplications: AiApplication[];
  displayMode: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  className?: string;
  setDisplayMode?: (mode: DisplayMode) => void; // 添加切换模式方法 / Add mode toggle method
  onMessagesReady?: (messages: Message[]) => void; // 回调：当消息准备好时 / Callback: when messages are ready
  conversationId?: string; // 会话ID，用于生成总结 / Conversation ID for summary generation
  isGeneratingSummary?: boolean; // 🔥 新增：是否正在生成总结 / New: Whether summary is being generated
  onGenerateSummary?: () => Promise<void>; // 🔥 新增：生成总结回调 / New: Generate summary callback
}

export function MessageList({
  chat,
  aiBindings,
  aiApplications,
  displayMode,
  onDisplayModeChange,
  className,
  setDisplayMode,
  onMessagesReady,
  conversationId,
  isGeneratingSummary = false,  // 🔥 新增：是否正在生成总结 / New: Whether summary is being generated
  onGenerateSummary,  // 🔥 新增：生成总结回调 / New: Generate summary callback
}: MessageListProps) {
  const { t } = useLanguage();  // 🔥 新增：国际化 / New: i18n
  const userMessage = chat.messages.find(m => m.role === 'user');
  const aiMessages = chat.messages.filter(m => m.role === 'assistant');
  const summaryMessage = chat.messages.find(m => m.role === 'summary');

  // 导出所有AI消息和总结消息给父组件使用 / Export all AI messages and summary for parent component
  const allOutputMessages = [...aiMessages, ...(summaryMessage ? [summaryMessage] : [])];

  // 当消息准备好时，通知父组件 / Notify parent when messages are ready
  useEffect(() => {
    if (onMessagesReady) {
      onMessagesReady(allOutputMessages);
    }
  }, [allOutputMessages, onMessagesReady]);

  // 滚动到指定消息 / Scroll to specific message
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 横排分页状态 / Horizontal pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 2; // 一行2个 / 2 items per row
  const currentPageRef = useRef<HTMLDivElement>(null);

  // 计算分页数据 / Calculate pagination data
  const totalPages = Math.ceil(aiBindings.length / itemsPerPage);
  const currentBindings = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return aiBindings.slice(start, start + itemsPerPage);
  }, [aiBindings, currentPage, itemsPerPage]);

  // 翻页后滚动到当前页 / Scroll to current page after pagination
  useEffect(() => {
    if (currentPageRef.current) {
      // 延迟执行，确保 DOM 已更新
      setTimeout(() => {
        const rect = currentPageRef.current!.getBoundingClientRect();
        const parent = currentPageRef.current!.closest('.overflow-y-auto') as HTMLElement;

        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const scrollTop = parent.scrollTop;

          // 尝试滚动到当前页顶部
          currentPageRef.current!.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // 再次检查，如果滚动后位置没有明显变化（说明内容太短），则滚动到当前页底部
          setTimeout(() => {
            const newRect = currentPageRef.current!.getBoundingClientRect();
            const newScrollTop = parent.scrollTop;

            // 如果滚动位置变化很小（小于 50px），说明当前页内容太短
            // 则滚动到当前页元素的底部
            if (Math.abs(newScrollTop - scrollTop) < 50) {
              const targetScroll = scrollTop + (newRect.bottom - parentRect.top) - parentRect.height + 50;
              parent.scrollTo({
                top: Math.max(0, targetScroll),
                behavior: 'smooth'
              });
            }
          }, 350);
        }
      }, 100);
    }
  }, [currentPage]);

  // 获取 AI 应用信息 / Get AI application info
  const getAiApp = (appId: string) => {
    return aiApplications.find(app => app.id === appId);
  };

  // 获取预览文本（前100字）/ Get preview text (first 100 chars)
  const getPreview = (content: string, maxLength = 100) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  // 处理生成总结 / Handle generate summary
  const handleGenerateSummary = async () => {
    if (!conversationId) return;

    // 🔥 使用回调函数（如果提供），由父组件处理校验和执行
    // 🔥 Use callback function (if provided), parent component handles validation and execution
    if (onGenerateSummary) {
      await onGenerateSummary();
      return;
    }

    // 兼容旧逻辑：如果没有提供回调，直接调用API（不推荐）
    // Compatible with old logic: if no callback provided, call API directly (not recommended)
    try {
      await window.electronAPI.conversations.generateSummary(conversationId, chat.chatId);
    } catch (error) {
      console.error('生成总结失败:', error);
      throw error;
    }
  };

  // 检查是否所有AI都已完成响应 / Check if all AI responses are completed
  // 🔥 使用公共方法检查 / Use common method to check
  const allCompleted = areAllAiOutputsComplete(chat, aiBindings.length);

  // 横排布局（分页）/ Horizontal layout with pagination
  if (displayMode === 'horizontal') {
    return (
      <div className={cn('flex gap-4', className)}>
        {/* 主内容区域 */}
        <div className="flex-1 space-y-6">
          {/* 用户消息 - 右侧对齐 */}
          {/* User message - right aligned */}
          {userMessage && (
            <div className="flex justify-end" id={`message-${userMessage.messageId}`}>
              <div className="max-w-2xl">
                <UserMessageBubble message={userMessage} />
              </div>
            </div>
          )}

          {/* AI 响应横排展示 - 分页 / AI responses horizontal with pagination */}
          <div className="space-y-4" ref={currentPageRef}>
          {/* 当前页的AI响应卡片 / Current page AI response cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentBindings.map(binding => {
              const app = getAiApp(binding.aiApplicationId);
              if (!app) return null;

              const message = aiMessages.find(m => m.sender === binding.aiApplicationId);

              return (
                <div
                  key={binding.aiApplicationId}
                  className="bg-bg-secondary border border-border-secondary rounded-xl overflow-hidden flex flex-col"
                  style={{ maxHeight: 'calc(100vh - 280px)', minHeight: '300px' }}
                  id={message ? `message-${message.messageId}` : undefined}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border-secondary flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 flex items-center justify-center">
                        {app.logoType === 'emoji' ? (
                          <span className="text-lg">{app.logoContent}</span>
                        ) : (
                          <img src={app.logoContent} alt={app.name} className="w-6 h-6 object-contain" />
                        )}
                      </div>
                      <span className="font-semibold text-text-primary">{app.name}</span>
                    </div>
                    {/* 编辑按钮 - Header 右上角 */}
                    {/* 🔥 【修改】失败状态（sendFailed、outputTimeout、outputFailed）也支持编辑 */}
                    {/* 🔥 【Modified】Failed states (sendFailed, outputTimeout, outputFailed) also support editing */}
                    {conversationId && message && (
                      <button
                        onClick={() => {
                          // 触发编辑状态
                          const editButton = document.querySelector(`[data-edit-trigger="${message.messageId}"]`) as HTMLButtonElement;
                          editButton?.click();
                        }}
                        className="p-1.5 rounded-lg bg-bg-secondary border border-border-secondary hover:bg-bg-tertiary transition-colors"
                        title="编辑消息 / Edit message"
                      >
                        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 overflow-y-auto">
                    {(() => {
                      // 根据 message.status 展示不同状态 / Display different states based on message.status
                      switch (message.status) {
                        case 'sending':
                          return <SendingMessage app={app} />;
                        case 'waiting':
                          return <WaitingMessage app={app} />;
                        case 'sendFailed':
                          return <SendFailedMessage message={message} conversationId={conversationId} />;
                        case 'outputTimeout':
                          return <OutputTimeoutMessage message={message} conversationId={conversationId} />;
                        case 'outputFailed':
                          return <OutputFailedMessage message={message} conversationId={conversationId} />;
                        case 'success':
                        default:
                          // 兼容旧数据：没有 status 字段的默认为 success
                          return message.content ? (
                            <EditableMessageContent message={message} conversationId={conversationId} />
                          ) : (
                            <EmptyMessage app={app} />
                          );
                      }
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 分页控制 / Pagination controls */}
          <div className="flex items-center justify-center gap-3">
            {/* 切换显示模式按钮 - 与分页器同行 */}
            {setDisplayMode && (
              <button
                onClick={() => setDisplayMode('vertical')}
                className="p-2 rounded-lg border border-border-secondary bg-bg-primary transition-colors hover:bg-bg-tertiary"
                title="切换显示模式"
              >
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            )}

            {/* 生成总结按钮 - 只有所有AI都完成且有输出时才显示 */}
            {conversationId && allCompleted && aiMessages.length > 0 && !summaryMessage && (
              <button
                onClick={handleGenerateSummary}
                disabled={isGeneratingSummary}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-secondary bg-bg-primary hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('summary.button.title')}
              >
                {isGeneratingSummary ? (
                  <>
                    <Loading size="sm" />
                    <span className="text-sm">{t('summary.button.generating')}</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm">{t('summary.button')}</span>
                  </>
                )}
              </button>
            )}

            {/* 分页按钮 - 只有多页时显示 / Pagination buttons - show only when multiple pages */}
            {totalPages > 1 && (
              <>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  className={cn(
                    "p-2 rounded-lg border border-border-secondary transition-colors",
                    "hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  title="上一页"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <span className="text-sm text-text-secondary">
                  {currentPage + 1} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage >= totalPages - 1}
                  className={cn(
                    "p-2 rounded-lg border border-border-secondary transition-colors",
                    "hover:bg-bg-tertiary disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  title="下一页"
                >
                  <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* 总结消息 */}
          {summaryMessage && (
            <div className="mt-6" id={`message-${summaryMessage.messageId}`}>
              <SummaryMessage
                message={summaryMessage}
                conversationId={conversationId}
                isGeneratingSummary={isGeneratingSummary}
                onRefresh={onGenerateSummary}
              />
            </div>
          )}
          </div>
          </div>
      </div>
    );
  }

  // 竖排布局（默认） - 每个AI独占一行，宽度铺满 / Vertical layout (default) - each AI takes full width row
  return (
    <div id={`chat-${chat.chatId}`} className={cn('space-y-6', className)}>
      {/* 用户消息 - 右侧对齐 */}
      {/* User message - right aligned */}
      {userMessage && (
        <div className="flex justify-end" id={`message-${userMessage.messageId}`}>
          <div className="max-w-[85%]">
            <UserMessageBubble message={userMessage} />
          </div>
        </div>
      )}

      {/* AI 响应竖排展示 - 每个AI独占一行，宽度铺满 / AI responses vertical - each AI full width row */}
      <div className="space-y-4">
        {aiBindings.map((binding, index) => {
          const app = getAiApp(binding.aiApplicationId);
          if (!app) return null;

          const message = aiMessages.find(m => m.sender === binding.aiApplicationId);

          return (
            <div
              key={binding.aiApplicationId}
              className="flex gap-3"
              id={message ? `message-${message.messageId}` : undefined}
            >
              {/* AI Logo - 头像 */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-secondary border border-border-secondary flex items-center justify-center">
                {app.logoType === 'emoji' ? (
                  <span className="text-sm">{app.logoContent}</span>
                ) : (
                  <img src={app.logoContent} alt={app.name} className="w-6 h-6 object-contain" />
                )}
              </div>

              {/* 消息内容 - 宽度铺满 / Message content - full width */}
              <div className="flex-1 min-w-0 max-w-[85%]">
                <div className="bg-bg-secondary border border-border-secondary rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-border-secondary flex items-center justify-between">
                    <span className="font-semibold text-text-primary">{app.name}</span>
                    {/* 编辑按钮 - Header 右上角 */}
                    {/* 🔥 【修改】失败状态（sendFailed、outputTimeout、outputFailed）也支持编辑 */}
                    {/* 🔥 【Modified】Failed states (sendFailed, outputTimeout, outputFailed) also support editing */}
                    {conversationId && message && (
                      <button
                        onClick={() => {
                          // 触发编辑状态
                          const editButton = document.querySelector(`[data-edit-trigger="${message.messageId}"]`) as HTMLButtonElement;
                          editButton?.click();
                        }}
                        className="p-1.5 rounded-lg bg-bg-secondary border border-border-secondary hover:bg-bg-tertiary transition-colors"
                        title="编辑消息 / Edit message"
                      >
                        <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    {(() => {
                      // 根据 message.status 展示不同状态 / Display different states based on message.status
                      switch (message?.status) {
                        case 'sending':
                          return <SendingMessage app={app} />;
                        case 'waiting':
                          return <WaitingMessage app={app} />;
                        case 'sendFailed':
                          return <SendFailedMessage message={message} conversationId={conversationId} />;
                        case 'outputTimeout':
                          return <OutputTimeoutMessage message={message} conversationId={conversationId} />;
                        case 'outputFailed':
                          return <OutputFailedMessage message={message} conversationId={conversationId} />;
                        case 'success':
                        default:
                          // 兼容旧数据：没有 status 字段的默认为 success
                          return message?.content ? (
                            <EditableMessageContent message={message} conversationId={conversationId} />
                          ) : (
                            <EmptyMessage app={app} />
                          );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 切换显示模式按钮 - 最后一个气泡左下角 */}
      {setDisplayMode && aiBindings.length > 0 && (
        <div className="ml-11 flex items-center gap-2">
          <button
            onClick={() => setDisplayMode('horizontal')}
            className="p-2 rounded-lg border border-border-secondary bg-bg-primary transition-colors hover:bg-bg-tertiary"
            title="切换显示模式"
          >
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          {/* 生成总结按钮 - 只有所有AI都完成且有输出时才显示 */}
          {conversationId && allCompleted && aiMessages.length > 0 && !summaryMessage && (
            <button
              onClick={handleGenerateSummary}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-secondary bg-bg-primary hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              title={t('summary.button.title')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm">{t('summary.button')}</span>
            </button>
          )}
        </div>
      )}

      {/* 总结消息 */}
      {summaryMessage && (
        <div className="flex gap-3" id={`message-${summaryMessage.messageId}`}>
          {/* 占位，保持与输出气泡一致的左边距 */}
          <div className="flex-shrink-0 w-8"></div>
          {/* 总结消息内容 - 宽度与输出气泡一致 */}
          <div className="flex-1 min-w-0 max-w-[85%]">
            <SummaryMessage
              message={summaryMessage}
              conversationId={conversationId}
              isGeneratingSummary={isGeneratingSummary}
              onRefresh={onGenerateSummary}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 用户消息气泡 / User message bubble
 */
interface UserMessageBubbleProps {
  message: Message;
}

function UserMessageBubble({ message }: UserMessageBubbleProps) {
  return (
    <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-md">
      <p className="whitespace-pre-wrap break-words">{message.content}</p>
      <p className="text-xs opacity-70 mt-1">
        {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}

/**
 * 发送中状态 / Sending status
 */
function SendingMessage() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">{t('message.status.sending')}</span>
    </div>
  );
}

/**
 * 失败状态
 */
function FailedMessage({ message }: { message: Message }) {
  return (
    <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm">{message.content}</span>
    </div>
  );
}

/**
 * 空状态 / Empty status
 */
function EmptyMessage({ app }: { app: AiApplication }) {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center h-32 text-text-tertiary">
      <p className="text-sm">{t('message.status.empty').replace('{name}', app.name)}</p>
    </div>
  );
}

/**
 * 等待中状态（发送成功，等待AI输出）
 * Waiting status (message sent, waiting for AI output)
 */
function WaitingMessage() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-2 text-text-secondary">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
      <span className="text-sm">{t('message.status.waiting')}</span>
    </div>
  );
}

/**
 * 发送失败状态（可编辑）
 * Send failed status (editable)
 * 🔥 【修改】移除内部编辑UI，使用右上角的编辑按钮 / 【Modified】Removed internal edit UI, use header edit button
 */
interface SendFailedMessageProps {
  message: Message;
  conversationId?: string;
}
function SendFailedMessage({ message, conversationId }: SendFailedMessageProps) {
  const { t } = useLanguage();  // 🔥 新增：国际化 / New: i18n
  // 🔥 【新增】支持编辑模式，与 EditableMessageContent 保持一致
  // 🔥 【New】Support edit mode, consistent with EditableMessageContent
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!conversationId) {
      console.error('conversationId is required for saving message');
      return;
    }
    setIsSaving(true);
    try {
      await window.electronAPI.conversations.updateMessage(conversationId, message.messageId, content);
      setIsEditing(false);
    } catch (error) {
      console.error('保存消息失败 / Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(message.content || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        {/* 编辑模式工具栏 / Edit mode toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary">
          <span className="text-xs text-text-secondary">编辑模式 / Edit Mode</span>
          <div className="flex items-center gap-2">
            {/* 取消按钮 / Cancel button */}
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="取消 / Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 保存按钮 / Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-text-secondary hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
              title="保存 / Save"
            >
              {isSaving ? (
                <Loading size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* 文本编辑区域 / Text edit area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full px-3 py-2 bg-bg-primary text-text-primary text-sm resize-none focus:outline-none"
          autoFocus
          placeholder="请手动粘贴AI输出内容... / Please manually paste AI output..."
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 🔥 【新增】如果有内容，直接显示内容；否则显示错误提示 */}
      {/* 🔥 【New】If content exists, display content; otherwise show error */}
      {message.content ? (
        <MarkdownRenderer content={message.content} />
      ) : (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">
            {t('message.status.sendFailed').replace('{error}', message.error || t('message.status.unknownError'))}
          </span>
        </div>
      )}
      {/* 隐藏的触发按钮，用于 Header 中的编辑按钮调用 */}
      <button
        data-edit-trigger={message.messageId}
        onClick={() => setIsEditing(true)}
        className="hidden"
      />
    </div>
  );
}

/**
 * 输出超时状态（可编辑）
 * Output timeout status (editable)
 * 🔥 【修改】移除内部编辑UI，使用右上角的编辑按钮 / 【Modified】Removed internal edit UI, use header edit button
 */
interface OutputTimeoutMessageProps {
  message: Message;
  conversationId?: string;
}
function OutputTimeoutMessage({ message, conversationId }: OutputTimeoutMessageProps) {
  const { t } = useLanguage();  // 🔥 新增：国际化 / New: i18n
  // 🔥 【新增】支持编辑模式，与 EditableMessageContent 保持一致
  // 🔥 【New】Support edit mode, consistent with EditableMessageContent
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!conversationId) {
      console.error('conversationId is required for saving message');
      return;
    }
    setIsSaving(true);
    try {
      await window.electronAPI.conversations.updateMessage(conversationId, message.messageId, content);
      setIsEditing(false);
    } catch (error) {
      console.error('保存消息失败 / Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(message.content || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        {/* 编辑模式工具栏 / Edit mode toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary">
          <span className="text-xs text-text-secondary">编辑模式 / Edit Mode</span>
          <div className="flex items-center gap-2">
            {/* 取消按钮 / Cancel button */}
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="取消 / Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 保存按钮 / Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-text-secondary hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
              title="保存 / Save"
            >
              {isSaving ? (
                <Loading size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* 文本编辑区域 / Text edit area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full px-3 py-2 bg-bg-primary text-text-primary text-sm resize-none focus:outline-none"
          autoFocus
          placeholder="请手动粘贴AI输出内容... / Please manually paste AI output..."
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 🔥 【新增】如果有内容，直接显示内容；否则显示错误提示 */}
      {/* 🔥 【New】If content exists, display content; otherwise show error */}
      {message.content ? (
        <MarkdownRenderer content={message.content} />
      ) : (
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{t('message.status.outputTimeout')}</span>
        </div>
      )}
      {/* 隐藏的触发按钮，用于 Header 中的编辑按钮调用 */}
      <button
        data-edit-trigger={message.messageId}
        onClick={() => setIsEditing(true)}
        className="hidden"
      />
    </div>
  );
}

/**
 * 输出失败状态（可编辑）
 * Output failed status (editable)
 * 🔥 【修改】移除内部编辑UI，使用右上角的编辑按钮 / 【Modified】Removed internal edit UI, use header edit button
 */
interface OutputFailedMessageProps {
  message: Message;
  conversationId?: string;
}
function OutputFailedMessage({ message, conversationId }: OutputFailedMessageProps) {
  const { t } = useLanguage();  // 🔥 新增：国际化 / New: i18n
  // 🔥 【新增】支持编辑模式，与 EditableMessageContent 保持一致
  // 🔥 【New】Support edit mode, consistent with EditableMessageContent
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!conversationId) {
      console.error('conversationId is required for saving message');
      return;
    }
    setIsSaving(true);
    try {
      await window.electronAPI.conversations.updateMessage(conversationId, message.messageId, content);
      setIsEditing(false);
    } catch (error) {
      console.error('保存消息失败 / Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(message.content || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        {/* 编辑模式工具栏 / Edit mode toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary">
          <span className="text-xs text-text-secondary">编辑模式 / Edit Mode</span>
          <div className="flex items-center gap-2">
            {/* 取消按钮 / Cancel button */}
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="取消 / Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 保存按钮 / Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-text-secondary hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
              title="保存 / Save"
            >
              {isSaving ? (
                <Loading size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* 文本编辑区域 / Text edit area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full px-3 py-2 bg-bg-primary text-text-primary text-sm resize-none focus:outline-none"
          autoFocus
          placeholder="请手动粘贴AI输出内容... / Please manually paste AI output..."
        />
      </div>
    );
  }

  return (
    <div className="relative">
      {/* 🔥 【新增】如果有内容，直接显示内容；否则显示错误提示 */}
      {/* 🔥 【New】If content exists, display content; otherwise show error */}
      {message.content ? (
        <MarkdownRenderer content={message.content} />
      ) : (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">
            {t('message.status.outputFailed').replace('{error}', message.error || t('message.status.unknownError'))}
          </span>
        </div>
      )}
      {/* 隐藏的触发按钮，用于 Header 中的编辑按钮调用 */}
      <button
        data-edit-trigger={message.messageId}
        onClick={() => setIsEditing(true)}
        className="hidden"
      />
    </div>
  );
}

/**
 * 总结消息 / Summary message
 * 🔥 【新增】添加刷新功能 / 【New】Add refresh functionality
 */
interface SummaryMessageProps {
  message: Message;
  conversationId?: string;
  isGeneratingSummary?: boolean;
  onRefresh?: () => Promise<void>;
}
function SummaryMessage({ message, conversationId, isGeneratingSummary = false, onRefresh }: SummaryMessageProps) {
  const { t } = useLanguage();  // 🔥 新增：国际化 / New: i18n
  // 🔥 判断是否正在加载（内容为空或未定义）/ Check if loading (content is empty or undefined)
  // 🔥 【修复】增加类型检查，确保 content 是字符串
  // 🔥 【Fixed】Add type check to ensure content is string
  const isEmpty = !message.content ||
    message.content === null ||
    message.content === undefined ||
    (typeof message.content === 'string' && message.content.trim() === '');
  const isLoading = isEmpty;

  // 🔥 【新增】刷新总结的处理函数 / 【New】Handle refresh summary
  const handleRefresh = async () => {
    if (isGeneratingSummary || !onRefresh) return;
    try {
      await onRefresh();
    } catch (error) {
      console.error('刷新总结失败 / Failed to refresh summary:', error);
    }
  };

  return (
    <div className="bg-bg-tertiary border border-border-secondary rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-secondary">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="font-semibold text-text-primary">{t('summary.label')}</span>
        </div>
        {/* 🔥 【新增】刷新按钮 / 【New】Refresh button */}
        {!isLoading && onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isGeneratingSummary}
            className="p-1.5 rounded-lg bg-bg-secondary border border-border-secondary hover:bg-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('summary.refresh.title')}
          >
            {isGeneratingSummary ? (
              <Loading size="sm" />
            ) : (
              <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="p-4">
        {isLoading ? (
          // 🔥 加载状态 / Loading state
          <div className="flex items-center gap-2 text-text-secondary">
            <InlineLoading />
            <span className="text-sm">{t('summary.generating')}</span>
          </div>
        ) : (
          // 🔥 显示总结内容 / Display summary content
          <MarkdownRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}

/**
 * 可编辑的消息内容
 * Editable message content
 */
interface EditableMessageContentProps {
  message: Message;
  conversationId?: string;
}
function EditableMessageContent({ message, conversationId }: EditableMessageContentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!conversationId) {
      console.error('conversationId is required for saving message');
      return;
    }
    setIsSaving(true);
    try {
      await window.electronAPI.conversations.updateMessage(conversationId, message.messageId, content);
      setIsEditing(false);
    } catch (error) {
      console.error('保存消息失败 / Failed to save message:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(message.content || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="h-full flex flex-col">
        {/* 编辑模式工具栏 / Edit mode toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-secondary bg-bg-tertiary">
          <span className="text-xs text-text-secondary">编辑模式 / Edit Mode</span>
          <div className="flex items-center gap-2">
            {/* 取消按钮 / Cancel button */}
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 rounded hover:bg-bg-secondary transition-colors text-text-secondary hover:text-text-primary disabled:opacity-50"
              title="取消 / Cancel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {/* 保存按钮 / Save button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-text-secondary hover:text-green-600 dark:hover:text-green-400 disabled:opacity-50"
              title="保存 / Save"
            >
              {isSaving ? (
                <Loading size="sm" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {/* 文本编辑区域 / Text edit area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="flex-1 w-full px-3 py-2 bg-bg-primary text-text-primary text-sm resize-none focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MarkdownRenderer content={message.content} />
      {/* 隐藏的触发按钮，用于 Header 中的编辑按钮调用 */}
      <button
        data-edit-trigger={message.messageId}
        onClick={() => setIsEditing(true)}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
}
