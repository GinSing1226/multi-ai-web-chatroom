/**
 * ChatRoom - 聊天室页面（移动端）
 * Chat room page (Mobile)
 *
 * ⚠️ 【重要】移动端暂不使用，不用修改代码
 * ⚠️ 【IMPORTANT】Mobile version is not currently in use, do not modify this file
 *
 * 说明：此页面为移动端设计，目前项目只使用 PC 端（SessionList 页面）。
 * 如需启用移动端，请将 SessionList 页面的修改同步到此处。
 *
 * Note: This page is designed for mobile. Currently, only the PC version (SessionList page) is in use.
 * To enable mobile version, please sync changes from SessionList page to here.
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConversationStore } from '@renderer/stores/conversation.store';
import { useAiApplications } from '@renderer/stores/aiApplications.store';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { Conversation, Chat, DisplayMode, cn, areAllAiOutputsComplete } from '@shared';
import { MessageList } from '@renderer/components/common/MessageList';
import { MessageInput } from '@renderer/components/common/MessageInput';
import { Loading, InlineLoading } from '@renderer/components/ui/Loading';
import { ToastContainer, showToast } from '@renderer/components/ui/Toast';
import { ConfirmModal } from '@renderer/components/ui/Modal';

export default function ChatRoom() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    currentConversation,
    isLoading,
    displayMode,
    selectConversation,
    sendMessage,
    generateSummary,
    updateMetadata,
    deleteConversation,
    setDisplayMode,
  } = useConversationStore();

  const { aiApplications } = useAiApplications();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔥 【新增】内部任务状态 / Internal task status
  const [internalTaskStatus, setInternalTaskStatus] = useState<{ type: 'title' | 'summary' | null } | null>(null);

  // 当前浏览的 Chat 索引 / Current visible chat index
  const [currentChatIndex, setCurrentChatIndex] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 🔥 新增：离视口中心最近的消息 ID / Closest message IDs to viewport center
  const [closestUserMessageId, setClosestUserMessageId] = useState<string | null>(null);
  const [closestOutputMessageId, setClosestOutputMessageId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      selectConversation(id);
    }
  }, [id, selectConversation]);

  // 🔥 【新增】本地加载状态 / Local loading state (for immediate UI feedback)
  const [localLoadingState, setLocalLoadingState] = useState<{
    type: 'normal' | 'title' | 'summary' | null;
    conversationId: string | null;
  }>({ type: null, conversationId: null });

  // 🔥 【新增】监听会话更新事件，用于刷新总结消息等 / Listen to conversation update events
  useEffect(() => {
    const handleConversationUpdated = (event: CustomEvent) => {
      const updatedConversation = event.detail;
      console.log('📨 收到会话更新事件 / Received conversation update event:', updatedConversation);

      // 🔥 【关键】根据更新判断是否需要调整本地加载状态
      // 检查是否为第一轮对话且所有AI都已完成
      if (localLoadingState.type === 'normal' &&
          updatedConversation.conversationId === localLoadingState.conversationId) {

        const isFirstRound = updatedConversation.chats.length === 1;
        const latestChat = updatedConversation.chats[updatedConversation.chats.length - 1];
        const aiBindingsCount = updatedConversation.aiApplicationBindings.length;
        const isAllAiCompleted = areAllAiOutputsComplete(latestChat, aiBindingsCount);

        if (isFirstRound && isAllAiCompleted) {
          // 第一轮对话且所有AI完成 → 等待生成标题
          console.log('✅ 第一轮对话完成，等待生成标题 / First round completed, waiting for title generation');
          setLocalLoadingState({
            type: 'title',
            conversationId: updatedConversation.conversationId
          });
        } else if (!isFirstRound && isAllAiCompleted) {
          // 非第一轮对话且所有AI完成 → 清除本地状态
          console.log('✅ 非第一轮对话完成，清除本地状态 / Non-first round completed, clearing local state');
          setLocalLoadingState({ type: null, conversationId: null });
        }
      }

      // 如果是当前会话，重新加载会话数据
      if (updatedConversation.conversationId === currentConversation?.conversationId) {
        console.log('📨 收到会话更新事件，重新加载会话数据 / Received conversation update event, reloading conversation data');
        selectConversation(currentConversation.conversationId);
      }
    };

    // 添加事件监听
    window.addEventListener('conversation:updated', handleConversationUpdated as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('conversation:updated', handleConversationUpdated as EventListener);
    };
  }, [currentConversation?.conversationId, selectConversation, localLoadingState]);

  // 监听滚动，更新当前浏览的 Chat 索引和最近的标记点 / Listen to scroll and update current chat index and closest markers
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !currentConversation?.chats) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const centerY = containerRect.top + containerRect.height / 2;

      // 找到最接近视口中心的 Chat
      let closestIndex = 0;
      let minDistance = Infinity;

      currentConversation.chats.forEach((chat, index) => {
        const messageElement = document.getElementById(`chat-${chat.chatId}`);
        if (messageElement) {
          const rect = messageElement.getBoundingClientRect();
          const elementCenterY = rect.top + rect.height / 2;
          const distance = Math.abs(elementCenterY - centerY);

          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        }
      });

      setCurrentChatIndex(closestIndex);

      // 🔥 计算离视口中心最近的用户消息和输出消息 / Calculate closest user and output messages to viewport center
      let closestUserDist = Infinity;
      let closestOutputDist = Infinity;
      let newClosestUserMessageId: string | null = null;
      let newClosestOutputMessageId: string | null = null;

      // 只遍历可见的 chat（currentChatIndex 附近的几个）以提高性能
      // Only iterate visible chats (near currentChatIndex) for better performance
      const range = 3;
      const startIndex = Math.max(0, closestIndex - range);
      const endIndex = Math.min(currentConversation.chats.length - 1, closestIndex + range);

      for (let i = startIndex; i <= endIndex; i++) {
        const chat = currentConversation.chats[i];

        // 检查用户消息 / Check user messages
        const userMessage = chat.messages.find(m => m.role === 'user');
        if (userMessage) {
          const userElement = document.getElementById(`message-${userMessage.messageId}`);
          if (userElement) {
            const rect = userElement.getBoundingClientRect();
            const elementCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(elementCenterY - centerY);
            if (distance < closestUserDist) {
              closestUserDist = distance;
              newClosestUserMessageId = userMessage.messageId;
            }
          }
        }

        // 检查输出消息（AI 消息和总结消息）/ Check output messages (AI and summary)
        const outputMessages = chat.messages.filter(m => m.role === 'assistant' || m.role === 'summary');
        for (const message of outputMessages) {
          const outputElement = document.getElementById(`message-${message.messageId}`);
          if (outputElement) {
            const rect = outputElement.getBoundingClientRect();
            const elementCenterY = rect.top + rect.height / 2;
            const distance = Math.abs(elementCenterY - centerY);
            if (distance < closestOutputDist) {
              closestOutputDist = distance;
              newClosestOutputMessageId = message.messageId;
            }
          }
        }
      }

      setClosestUserMessageId(newClosestUserMessageId);
      setClosestOutputMessageId(newClosestOutputMessageId);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // 延迟执行初始滚动检测，确保 DOM 已完全渲染 / Delay initial scroll detection to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [currentConversation?.chats]);

  // 计算可见的输入标记点范围（前5轮、后5轮） / Calculate visible input marker range
  const visibleInputMarkers = useMemo(() => {
    if (!currentConversation?.chats) return [];
    const range = 5;
    const startIndex = Math.max(0, currentChatIndex - range);
    const endIndex = Math.min(currentConversation.chats.length - 1, currentChatIndex + range);

    return currentConversation.chats.slice(startIndex, endIndex + 1);
  }, [currentConversation?.chats, currentChatIndex]);

  // 滚动到指定消息 / Scroll to specific message
  const scrollToMessage = (messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 获取预览文本（前100字）/ Get preview text (first 100 chars)
  const getPreview = (content: string, maxLength = 100) => {
    if (!content) return '';
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  useEffect(() => {
    // 监听消息更新事件 / Listen for message update events
    const handleMessageUpdated = (_event: any, data: {
      conversationId: string;
      chatId: string;
      messageId: string;
      aiApplicationId: string;
      status: string;
      content?: string;
      error?: string;
      metadataChanged?: boolean;  // 🔥 新增：标记是否为元数据变更
    }) => {
      // 🔥 如果是元数据变更（如标题更新），清除本地加载状态
      if (data.metadataChanged && data.conversationId === id) {
        console.log('🔄 检测到元数据变更，清除本地加载状态 / Metadata changed, clearing local loading state');
        if (localLoadingState.type === 'title') {
          setLocalLoadingState({ type: null, conversationId: null });
        }
        selectConversation(id);
        return;
      }

      // 如果是当前会话，重新加载会话数据
      // If it's the current conversation, reload conversation data
      if (data.conversationId === id) {
        selectConversation(id);
      }
    };

    // 注册监听器 / Register listener
    if (window.electronAPI?.conversations?.onMessageUpdated) {
      window.electronAPI.conversations.onMessageUpdated(handleMessageUpdated);
    }

    // 清理监听器 / Cleanup listener
    return () => {
      window.electronAPI?.conversations?.removeMessageUpdatedListener?.(handleMessageUpdated);
    };
  }, [id, selectConversation, localLoadingState]);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.chats]);

  if (!id) {
    return <div>Invalid conversation ID</div>;
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    );
  }

  if (!currentConversation) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">{t('chat.notFound')}</h2>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:underline"
          >
            {t('chat.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  const handleSendMessage = async (content: string) => {
    // 🔥 新增：立即设置本地加载状态 / Set local loading state immediately
    setLocalLoadingState({
      type: 'normal',
      conversationId: currentConversation.conversationId
    });

    try {
      await sendMessage(content);
      showToast({
        message: t('toast.messageSent'),
        type: 'success',
      });
      // 🔥 注意：不清除本地状态，让轮询来清除状态
      // Note: Don't clear local state here, let polling clear it
    } catch (error) {
      // 🔥 失败时清除本地状态 / Clear local state on failure
      setLocalLoadingState({ type: null, conversationId: null });
      showToast({
        message: error instanceof Error ? error.message : t('chat.sendFailed'),
        type: 'error',
      });
    }
  };
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t('chat.sendFailed'),
        type: 'error',
      });
    }
  };

  const handleGenerateSummary = async () => {
    const latestChat = currentConversation.chats[currentConversation.chats.length - 1];
    if (!latestChat) {
      showToast({
        message: t('chat.noMessages'),
        type: 'warning',
      });
      return;
    }

    // 🔥 新增：立即设置本地加载状态 / Set local loading state immediately
    setLocalLoadingState({
      type: 'summary',
      conversationId: currentConversation.conversationId
    });

    try {
      await generateSummary(latestChat.chatId);
      showToast({
        message: t('chat.generatingSummary'),
        type: 'info',
      });
      // 🔥 注意：不清除本地状态，让轮询来清除状态
      // Note: Don't clear local state here, let polling clear it
    } catch (error) {
      // 🔥 失败时清除本地状态 / Clear local state on failure
      setLocalLoadingState({ type: null, conversationId: null });
      showToast({
        message: error instanceof Error ? error.message : t('chat.generateFailed'),
        type: 'error',
      });
    }
  };
      });
    }
  };

  const handleDeleteConversation = async () => {
    try {
      await deleteConversation(currentConversation.conversationId);
      navigate('/');
      showToast({
        message: t('session.archiveSuccess'),
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t('chat.sendFailed'),
        type: 'error',
      });
    }
  };

  const handleSaveTitle = async () => {
    if (!editTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    try {
      await updateMetadata({
        conversationName: editTitle.trim(),
      });
      setIsEditingTitle(false);
      showToast({
        message: t('chat.titleUpdated'),
        type: 'success',
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : t('chat.updateFailed'),
        type: 'error',
      });
    }
  };

  const toggleDisplayMode = () => {
    // 切换显示模式 / Toggle display mode
    const newMode: DisplayMode = displayMode === 'vertical' ? 'horizontal' : 'vertical';
    setDisplayMode(newMode);
  };

  const hasMessages = currentConversation.chats.length > 0;

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-secondary">
        <div className="flex items-center gap-4">
          {/* 返回按钮 */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
            title={t('chat.backToList')}
          >
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* 会话标题 */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                  className="px-2 py-1 rounded border border-border-secondary bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-1 rounded hover:bg-bg-tertiary text-green-600"
                  title={t('chat.saveTitle')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsEditingTitle(false)}
                  className="p-1 rounded hover:bg-bg-tertiary text-red-600"
                  title={t('chat.cancelEdit')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditTitle(currentConversation.conversationName);
                  setIsEditingTitle(true);
                }}
                className="font-semibold text-text-primary hover:text-blue-600 transition-colors"
                title={t('chat.clickToEditTitle')}
              >
                {currentConversation.conversationName}
              </button>
            )}
          </div>

          {/* AI 应用徽章 */}
          <div className="flex gap-2">
            {currentConversation.aiApplicationBindings.map((binding) => {
              const app = aiApplications.find(a => a.id === binding.aiApplicationId);
              return app ? (
                <div
                  key={binding.aiApplicationId}
                  className="w-6 h-6 flex items-center justify-center"
                  title={app.name}
                >
                  {app.logoType === 'emoji' ? (
                    <span className="text-sm">{app.logoContent}</span>
                  ) : (
                    <img src={app.logoContent} alt={app.name} className="w-6 h-6" />
                  )}
                </div>
              ) : null;
            })}
          </div>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 切换显示模式 */}
          <button
            onClick={toggleDisplayMode}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
            title={displayMode === 'vertical' ? t('chat.switchToHorizontal') : t('chat.switchToVertical')}
          >
            {displayMode === 'vertical' ? (
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M4 9h16M4 15h16" />
              </svg>
            )}
          </button>

          {/* 生成总结 */}
          {hasMessages && (
            <button
              onClick={handleGenerateSummary}
              className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors"
              title={t('chat.generateSummary')}
            >
              <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}

          {/* 删除会话 */}
          <button
            onClick={() => setDeleteConfirm(true)}
            className="p-2 rounded-lg hover:bg-bg-tertiary transition-colors text-red-600"
            title={t('chat.deleteConversation')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* 消息区域 */}
      <div className="flex-1 flex overflow-hidden">
        {hasMessages ? (
          <>
            {/* 左侧导航 - 当前 Chat 的输出标记点 */}
            <div className="flex flex-col items-center gap-1 py-4 sticky top-4 h-fit">
              {(() => {
                const currentChat = currentConversation.chats[currentChatIndex];
                if (!currentChat) return null;

                // 横排时显示当前轮的标记点，竖排时显示所有 AI 消息和总结消息
                if (displayMode === 'horizontal') {
                  // 横排模式：显示当前轮的AI消息和总结消息标记点
                  const outputMessages = currentChat.messages.filter(m => m.role === 'assistant' || m.role === 'summary');
                  return outputMessages.map(message => {
                    const isClosest = message.messageId === closestOutputMessageId;
                    return (
                      <div key={message.messageId} className="relative group">
                        <button
                          onClick={() => scrollToMessage(message.messageId)}
                          className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                            isClosest
                              ? 'bg-blue-500 hover:bg-blue-600'
                              : 'bg-text-tertiary hover:bg-text-secondary opacity-60 hover:opacity-100'
                          }`}
                          title={message.role === 'summary'
                            ? `${t('session.summary')}: ${getPreview(message.content, 50)}`
                            : `${aiApplications.find(a => a.id === message.sender)?.name || 'AI'}: ${getPreview(message.content, 50)}`
                          }
                        />
                        {/* 悬浮预览 */}
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-bg-secondary border border-border-secondary rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                          <p className="text-xs text-text-secondary line-clamp-3">
                            {message.role === 'summary'
                              ? `${t('session.summary')}: ${getPreview(message.content)}`
                              : `${aiApplications.find(a => a.id === message.sender)?.name || 'AI'}: ${getPreview(message.content)}`
                            }
                          </p>
                        </div>
                      </div>
                    );
                  });
                }

                // 竖排显示所有 AI 消息和总结消息标记点
                const outputMessages = currentChat.messages.filter(m => m.role === 'assistant' || m.role === 'summary');
                return outputMessages.map(message => {
                  const app = aiApplications.find(a => a.id === message.sender);
                  const appName = app ? app.name : 'AI';
                  const title = message.role === 'summary'
                    ? `${t('session.summary')}: ${getPreview(message.content, 50)}`
                    : `${appName}: ${getPreview(message.content, 50)}`;
                  const previewContent = message.role === 'summary'
                    ? `${t('session.summary')}: ${getPreview(message.content)}`
                    : `${appName}: ${getPreview(message.content)}`;
                  const isClosest = message.messageId === closestOutputMessageId;

                  return (
                    <div key={message.messageId} className="relative group">
                      <button
                        onClick={() => scrollToMessage(message.messageId)}
                        className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                          isClosest
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-gray-400 hover:bg-gray-500'
                        }`}
                        title={title}
                      />
                      {/* 悬浮预览 */}
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-bg-secondary border border-border-secondary rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <p className="text-xs text-text-secondary line-clamp-3">
                          {previewContent}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* 主消息区域 */}
            <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
              <div className="max-w-7xl mx-auto py-6 px-4 space-y-8">
                {currentConversation.chats.map((chat) => (
                  <MessageList
                    key={chat.chatId}
                    chat={chat}
                    aiBindings={currentConversation.aiApplicationBindings}
                    aiApplications={aiApplications}
                    displayMode={displayMode}
                    setDisplayMode={setDisplayMode}
                    conversationId={currentConversation.conversationId}
                    isGeneratingSummary={localLoadingState.type === 'summary'}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 右侧导航 - 所有 Chats 的输入标记点（前5轮、后5轮） */}
            <div className="flex flex-col items-center gap-1 py-4 sticky top-4 h-fit">
              {visibleInputMarkers.map((chat) => {
                const userMessage = chat.messages.find(m => m.role === 'user');
                if (!userMessage) return null;

                // 判断是否为离视口中心最近的用户消息 / Check if this is the closest user message to viewport center
                const isClosest = userMessage.messageId === closestUserMessageId;

                return (
                  <div key={chat.chatId} className="relative group">
                    <button
                      onClick={() => scrollToMessage(userMessage.messageId)}
                      className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                        isClosest
                          ? 'bg-blue-500 hover:bg-blue-600'
                          : 'bg-gray-400 hover:bg-gray-500'
                      }`}
                      title={getPreview(userMessage.content)}
                    />
                    {/* 悬浮预览 */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 bg-bg-secondary border border-border-secondary rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <p className="text-xs text-text-secondary line-clamp-3">
                        {getPreview(userMessage.content)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-2xl px-6">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  {t('welcome.selectAI')}
                </h3>
                <p className="text-text-secondary">
                  {t('welcome.selectAIDesc')}
                </p>
              </div>

              {/* AI 应用选择网格 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {aiApplications
                  .filter(app => app.isEnabled)
                  .map(app => {
                    const isSelected = currentConversation.aiApplicationBindings.some(
                      binding => binding.aiApplicationId === app.id
                    );
                    return (
                      <button
                        key={app.id}
                        onClick={async () => {
                          // 切换 AI 应用选择状态
                          const currentBindings = currentConversation.aiApplicationBindings;
                          const isCurrentlyBound = currentBindings.some(
                            b => b.aiApplicationId === app.id
                          );

                          try {
                            if (isCurrentlyBound) {
                              // 取消绑定
                              await window.electronAPI.conversations.unbindAiApplication(
                                currentConversation.conversationId,
                                app.id
                              );
                            } else {
                              // 绑定 AI 应用
                              await window.electronAPI.conversations.bindAiApplication(
                                currentConversation.conversationId,
                                app.id
                              );
                            }
                            // 重新加载会话以更新绑定状态
                            await selectConversation(currentConversation.conversationId);
                          } catch (error) {
                            console.error('切换 AI 应用失败:', error);
                            showToast({
                              message: isCurrentlyBound
                                ? t('welcome.deselectFailed')
                                : t('welcome.selectFailed'),
                              type: 'error'
                            });
                          }
                        }}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all duration-200',
                          'flex flex-col items-center gap-3 hover:shadow-lg',
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-border-secondary bg-bg-secondary hover:border-blue-300 dark:hover:border-blue-700'
                        )}
                        title={app.description}
                      >
                        {/* Logo */}
                        <div className="w-12 h-12 flex items-center justify-center">
                          {app.logoType === 'emoji' ? (
                            <span className="text-3xl">{app.logoContent}</span>
                          ) : (
                            <img
                              src={app.logoContent}
                              alt={app.name}
                              className="w-10 h-10 object-contain"
                            />
                          )}
                        </div>

                        {/* 名称 */}
                        <div className="text-center">
                          <div className="font-medium text-text-primary text-sm">
                            {app.name}
                          </div>
                          {isSelected && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              {t('welcome.selected')}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>

              {/* 提示信息 */}
              <div className="text-sm text-text-tertiary">
                {currentConversation.aiApplicationBindings.length === 0
                  ? t('welcome.selectAtLeastOne')
                  : t('welcome.readyToStart', { count: currentConversation.aiApplicationBindings.length })
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 / Input area */}
      {/* 🔥 内部任务加载提示（基于本地状态） / Internal task loading indicator (based on local state) */}
      {localLoadingState.type !== null && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 mb-2">
          <InlineLoading />
          <span className="text-sm text-text-secondary">
            {(() => {
              // 显示本地状态 / Show local state
              const conversationId = localLoadingState.conversationId || '未知';
              let messageKey = '';
              if (localLoadingState.type === 'normal') {
                messageKey = 'active.normal';
              } else if (localLoadingState.type === 'title') {
                messageKey = 'active.title';
              } else if (localLoadingState.type === 'summary') {
                messageKey = 'active.summary';
              }
              return messageKey ? t(messageKey).replace('{conversationId}', conversationId) : `处理中，请等待完成后再行动。当前活跃会话：${conversationId}`;
            })()}
          </span>
        </div>
      )}

      <MessageInput
        onSend={handleSendMessage}
        disabled={
          isLoading ||
          !currentConversation ||
          currentConversation.aiApplicationBindings.length === 0 ||
          localLoadingState.type !== null ||
          // 🔥 检查最新一轮是否所有AI都已完成
          (currentConversation.chats.length > 0 &&
           !areAllAiOutputsComplete(
             currentConversation.chats[currentConversation.chats.length - 1],
             currentConversation.aiApplicationBindings.length
           ))
        }
      />

      {/* Toast 容器 */}
      <ToastContainer />

      {/* 删除确认 */}
      <ConfirmModal
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDeleteConversation}
        title={t('chat.deleteConversation')}
        message={t('chat.confirmDelete', { title: currentConversation.conversationName })}
        confirmText={t('chat.deleteButton')}
        cancelText={t('chat.cancelButton')}
        variant="danger"
      />
    </div>
  );
}
