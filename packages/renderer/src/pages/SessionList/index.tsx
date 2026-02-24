/**
 * SessionList - 会话列表页面（主页面）
 * Session list page (main page)
 */

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversationStore } from '@renderer/stores/conversation.store';
import { useAiApplications } from '@renderer/stores/aiApplications.store';
import { useLanguage } from '@renderer/contexts/LanguageContext';
import { Conversation, cn, areAllAiOutputsComplete } from '@shared';
import { ToastContainer, showToast } from '@renderer/components/ui/Toast';
import { ConfirmModal, DropdownMenu, MenuItem } from '@renderer/components/ui';
import { InlineLoading } from '@renderer/components/ui/Loading';
import { MessageInput } from '@renderer/components/common/MessageInput';
import { MessageList } from '@renderer/components/common/MessageList';
import { EditConversationModal, ArchiveModal } from '@renderer/components/modals';
import { SettingsModal } from '@renderer/components/modals/SettingsModal';

export default function SessionList() {
  console.log('🚀 SessionList component rendering...');
  const navigate = useNavigate();
  const {
    conversations,
    currentConversation,
    isLoading,
    displayMode,
    loadConversations,
    createConversation,
    deleteConversation,
    selectConversation,
    sendMessage,
    setDisplayMode,
  } = useConversationStore();

  const { aiApplications, loadAiApplications } = useAiApplications();
  const { t, language } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 🔥 【新增】用于记录上一次chats数量，判断是否需要滚动 / 【New】Record previous chats length to determine if scroll is needed
  const prevChatsLengthRef = useRef(0);

  // 🔥 【新增】滚动位置缓存 / 【New】Scroll position cache
  const scrollPositionRef = useRef<number | null>(null);
  const isRestoringScrollRef = useRef(false);

  // 当前浏览的 Chat 索引 / Current visible chat index
  const [currentChatIndex, setCurrentChatIndex] = useState(0);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 🔥 新增：离视口中心最近的消息 ID / Closest message IDs to viewport center
  const [closestUserMessageId, setClosestUserMessageId] = useState<string | null>(null);
  const [closestOutputMessageId, setClosestOutputMessageId] = useState<string | null>(null);

  // 🔥 【新增】本地加载状态 / Local loading state (for immediate UI feedback)
  const [localLoadingState, setLocalLoadingState] = useState<{
    type: 'normal' | 'title' | 'summary' | null;
    conversationId: string | null;
  }>({ type: null, conversationId: null });

  // 🔥 【新增】AI 应用切换状态 / AI application toggling state
  const [togglingAiApp, setTogglingAiApp] = useState<string | null>(null);

  // 🔥 【新增】使用 ref 跟踪当前正在处理的 AI 应用 ID
  // 🔥 【New】Use ref to track currently processing AI application ID
  const processingAppIdRef = useRef<string | null>(null);

  // 🔥 【新增】本地缓存的已选 AI 应用 ID（用于乐观更新）
  // 🔥 【New】Locally cached selected AI application IDs (for optimistic update)
  const [localSelectedAiApps, setLocalSelectedAiApps] = useState<Set<string>>(new Set());

  // 🔥 【新增】使用 ref 保存 localLoadingState 的最新值，供闭包中的监听器访问
  // 🔥 【New】Use ref to store latest localLoadingState value for access in closure listeners
  const localLoadingStateRef = useRef(localLoadingState);

  // 🔥 每次更新 localLoadingState 时同步更新 ref
  // 🔥 Update ref whenever localLoadingState changes
  useEffect(() => {
    localLoadingStateRef.current = localLoadingState;
  }, [localLoadingState]);

  // 🔥 【新增】同步当前会话的 AI 应用绑定到本地状态
  // 🔥 【New】Sync current conversation's AI application bindings to local state
  useEffect(() => {
    if (currentConversation) {
      const boundIds = new Set(currentConversation.aiApplicationBindings.map(b => b.aiApplicationId));
      setLocalSelectedAiApps(boundIds);
    }
  }, [currentConversation?.conversationId, currentConversation?.aiApplicationBindings.length]);

  // 🔥 【新增】AI 应用切换处理函数（使用 useCallback 确稳定性）
  // 🔥 【New】AI application toggle handler (use useCallback for stability)
  const handleToggleAiApp = useCallback(async (appId: string) => {
    // 🔥 检查是否有正在处理的操作 / Check if there's an ongoing operation
    if (processingAppIdRef.current !== null) {
      console.log('⏳ 正在处理中，请稍候 / Processing, please wait:', processingAppIdRef.current);
      return;
    }

    // 🔥 设置正在处理的应用 ID / Set processing app ID
    processingAppIdRef.current = appId;
    setTogglingAiApp(appId);

    const conversationId = currentConversation.conversationId;
    const isCurrentlySelected = localSelectedAiApps.has(appId);

    try {
      if (isCurrentlySelected) {
        // 取消绑定
        await window.electronAPI.conversations.unbindAiApplication(conversationId, appId);
        // 🔥 乐观更新 / Optimistic update
        setLocalSelectedAiApps(prev => {
          const next = new Set(prev);
          next.delete(appId);
          return next;
        });
      } else {
        // 绑定 AI 应用
        await window.electronAPI.conversations.bindAiApplication(conversationId, appId);
        // 🔥 乐观更新 / Optimistic update
        setLocalSelectedAiApps(prev => new Set(prev).add(appId));
      }
    } catch (error) {
      console.error('切换 AI 应用失败:', error);
      showToast({
        message: isCurrentlySelected ? t('welcome.deselectFailed') : t('welcome.selectFailed'),
        type: 'error'
      });
      // 🔥 失败时重新加载会话以同步状态 / Reload to sync state on error
      await selectConversation(conversationId);
    } finally {
      // 🔥 清除处理中状态 / Clear processing state
      processingAppIdRef.current = null;
      setTogglingAiApp(null);
    }
  }, [currentConversation, localSelectedAiApps, selectConversation, t]);

  // 存储每个 Chat 的输出消息（包括 AI 消息和总结消息）/ Store output messages for each chat
  const [chatOutputMessages, setChatOutputMessages] = useState<Map<string, Message[]>>(new Map());

  useEffect(() => {
    loadAiApplications();
    loadConversations();

    // 🔥 【新增】页面加载时恢复活跃状态（处理刷新场景）
    // 🔥 【New】Restore active session on page load (handle refresh scenario)
    const restoreActiveSession = async () => {
      try {
        const activeSession = await window.electronAPI.conversations.getActiveSession();
        if (activeSession && activeSession.conversationId) {
          console.log('✅ 恢复活跃状态:', activeSession);
          setLocalLoadingState({
            type: activeSession.type,
            conversationId: activeSession.conversationId
          });
        }
      } catch (error) {
        console.error('❌ 读取活跃状态失败:', error);
      }
    };

    restoreActiveSession();
  }, []); // 🔥 【修改】空依赖数组，只在组件挂载时执行一次

  // 🔥 【新增】ref 用于存储 currentConversation，避免 useEffect 依赖
  // 🔥 【New】ref to store currentConversation, avoid useEffect dependency
  const currentConversationRef2 = useRef(currentConversation);
  useEffect(() => {
    currentConversationRef2.current = currentConversation;
  }, [currentConversation]);

  // 🔥 【新增】监听会话更新事件，用于刷新总结消息等 / Listen to conversation update events
  useEffect(() => {
    const handleConversationUpdated = (event: CustomEvent) => {
      const updatedConversation = event.detail;
      console.log('📨 收到会话更新事件 / Received conversation update event:', updatedConversation);

      // 🔥 【关键】根据更新判断是否需要调整本地加载状态
      // 检查是否为第一轮对话且所有AI都已完成
      // 🔥 【修改】从 ref 获取最新状态，避免闭包依赖
      const localState = localLoadingStateRef.current;
      if (localState.type === 'normal' &&
          updatedConversation.conversationId === localState.conversationId) {

        const isFirstRound = updatedConversation.chats.length === 1;
        const latestChat = updatedConversation.chats[updatedConversation.chats.length - 1];
        const aiBindingsCount = updatedConversation.aiApplicationBindings.length;

        // 🔥 检查 latestChat 是否存在 / Check if latestChat exists
        if (!latestChat) {
          console.warn('⚠️ latestChat 为空，跳过状态更新 / latestChat is empty, skipping state update');
          return;
        }

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

      // 如果是当前正在查看的会话，更新当前会话数据
      // 🔥 【修改】从 ref 获取最新 currentConversation
      const current = currentConversationRef2?.current;
      if (current && updatedConversation.conversationId === current.conversationId) {
        console.log('🔄 更新当前会话数据 / Updating current conversation data');
        selectConversation(updatedConversation.conversationId);
      } else {
        // 否则，刷新会话列表（因为可能新增了总结消息等）
        console.log('🔄 刷新会话列表 / Refreshing conversation list');
        loadConversations();
      }
    };

    // 添加事件监听
    window.addEventListener('conversation:updated', handleConversationUpdated as EventListener);

    // 清理函数
    return () => {
      window.removeEventListener('conversation:updated', handleConversationUpdated as EventListener);
    };
  }, []); // 🔥 【修改】空依赖数组，使用 ref 获取最新状态

  // 根据路由参数选择会话
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get('conversation') || window.location.pathname.split('/').pop();
    if (conversationId && conversationId !== 'conversation') {
      handleSelectConversation(conversationId);
    }
  }, []);

  // 🔥 监听消息更新事件 / Listen for message update events
  // 🔥 只在组件挂载时注册一次，避免重复注册
  useEffect(() => {
    console.log('📍 注册消息更新监听器 / Registering message update listener');

    const handleMessageUpdated = (_event: any, data: {
      conversationId: string;
      metadataChanged?: boolean;  // 🔥 新增：标记是否为元数据变更
      internalTaskComplete?: boolean;  // 🔥 新增：标记是否为内部任务完成
    }) => {
      console.log('📨 收到消息更新事件 / Received message update event:', data);

      // 🔥 如果是元数据变更（如标题更新），刷新会话列表并清除本地加载状态
      // 🔥 If metadata changed (e.g., title update), refresh conversation list and clear local loading state
      if (data.metadataChanged) {
        console.log('🔄 检测到元数据变更，刷新会话列表 / Metadata changed, refreshing conversation list...');
        console.log('   本地状态类型:', localLoadingStateRef.current.type);
        console.log('   本地状态会话ID:', localLoadingStateRef.current.conversationId);
        console.log('   事件会话ID:', data.conversationId);

        // 🔥 清除本地加载状态（标题生成完成或总结生成完成）
        // 🔥 匹配条件：状态类型为 title 或 summary，且会话ID一致
        if ((localLoadingStateRef.current.type === 'title' || localLoadingStateRef.current.type === 'summary') &&
            localLoadingStateRef.current.conversationId === data.conversationId) {
          console.log('✅ 内部任务完成，清除本地加载状态 / Internal task completed, clearing local loading state');
          setLocalLoadingState({ type: null, conversationId: null });
        }

        loadConversations();
        return;
      }

      // 🔥 直接从 store 获取最新的 currentConversation，而不是使用闭包中的值
      // 🔥 Get latest currentConversation from store instead of using closure value
      const state = useConversationStore.getState();
      const current = state.currentConversation;

      console.log('🔍 当前会话检查 / Current conversation check:');
      console.log('   当前:', current?.conversationId);
      console.log('   收到:', data.conversationId);

      // 🔥 【新增】如果是内部任务完成（总结或标题生成完成），清除本地加载状态
      // 🔥 【New】If internal task completed (summary or title generation), clear local loading state
      if (data.internalTaskComplete && localLoadingStateRef.current.conversationId === data.conversationId) {
        console.log('✅ 检测到内部任务完成，清除本地加载状态 / Internal task completion detected, clearing local loading state');
        console.log('   本地状态类型:', localLoadingStateRef.current.type);

        // 🔥 【新增】标记需要恢复滚动位置 / 【New】Mark scroll position for restoration
        isRestoringScrollRef.current = true;

        setLocalLoadingState({ type: null, conversationId: null });
      }

      // 如果是当前会话，重新加载会话数据
      // If it's current conversation, reload conversation data
      if (current?.conversationId === data.conversationId) {
        console.log('🔄 重新加载当前会话 / Reloading current conversation...');
        selectConversation(data.conversationId);
      } else {
        console.log('⏭️ 跳过，不是当前会话 / Skipped, not current conversation');
      }
    };

    // 注册监听器 / Register listener
    if (window.electronAPI?.conversations?.onMessageUpdated) {
      window.electronAPI.conversations.onMessageUpdated(handleMessageUpdated);
      console.log('✅ 监听器已注册 / Listener registered');
    } else {
      console.error('❌ onMessageUpdated 方法不存在 / onMessageUpdated method does not exist');
    }

    // 清理监听器 / Cleanup listener
    return () => {
      console.log('🧹 清理消息更新监听器 / Cleaning up message update listener');
      window.electronAPI?.conversations?.removeMessageUpdatedListener?.(handleMessageUpdated);
    };
  }, []); // 🔥 空依赖数组，只注册一次

  // 点击会话
  const handleSelectConversation = async (conversationId: string) => {
    console.log('📌 点击会话:', conversationId);
    setSelectedConversationId(conversationId);
    navigate(`/conversation/${conversationId}`, { replace: true });
    await selectConversation(conversationId);
  };

  // 🔥 【修改】自动滚动，但刷新总结时不滚动 / 【Modified】Auto-scroll, but don't scroll on summary refresh
  useEffect(() => {
    const currentChats = currentConversation?.chats || [];
    const prevLength = prevChatsLengthRef.current;
    const container = messagesContainerRef.current;

    // 🔥 【新增】如果是恢复滚动状态，恢复位置后退出
    // 🔥 【New】If restoring scroll position, restore and exit
    if (isRestoringScrollRef.current && scrollPositionRef.current !== null && container) {
      console.log('🔄 恢复滚动位置:', scrollPositionRef.current);
      container.scrollTop = scrollPositionRef.current;
      isRestoringScrollRef.current = false;
      scrollPositionRef.current = null;
      return;
    }

    // 🔥 【新增】保存当前滚动位置
    // 🔥 【New】Save current scroll position
    if (container) {
      scrollPositionRef.current = container.scrollTop;
    }

    // 🔥 【新增】检查是否只是总结内容变化（刷新中），如果是则不滚动
    // 🔥 【New】Check if only summary content changed (refreshing), if so don't scroll
    // 如果chats数量没变，只是总结内容变化，不滚动
    if (currentChats.length === prevLength && currentChats.length > 0) {
      const lastChat = currentChats[currentChats.length - 1];
      const summaryMessage = lastChat?.messages.find(m => m.role === 'summary');
      // 如果最后一个chat有总结消息且内容为空，说明是刷新总结，不滚动
      if (summaryMessage && !summaryMessage.content) {
        console.log('🔄 检测到总结刷新中，跳过自动滚动 / Summary refresh detected, skipping auto-scroll');
        return;
      }
    }

    prevChatsLengthRef.current = currentChats.length;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.chats]);

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

  // 创建会话（直接创建空会话，不选择 AI 应用）
  // Create conversation (create empty conversation directly, no AI applications selected)
  const handleCreateConversation = async () => {
    try {
      // 🔥 新增：检查本地是否有活跃会话 / Check if there's a local active session
      if (localLoadingState.type !== null) {
        const conversationId = localLoadingState.conversationId || '未知';
        let messageKey = '';
        if (localLoadingState.type === 'normal') {
          messageKey = 'active.newChat.normal';
        } else if (localLoadingState.type === 'title') {
          messageKey = 'active.newChat.title';
        } else if (localLoadingState.type === 'summary') {
          messageKey = 'active.newChat.summary';
        }

        showToast({
          message: t(messageKey).replace('{conversationId}', conversationId),
          type: 'error'
        });
        return;
      }

      // 🔥 新增：如果当前有会话，检查最新一轮是否所有AI都已完成
      // 🔥 Check if all AIs have completed in the latest round of current conversation
      if (currentConversation && currentConversation.chats.length > 0) {
        const latestChat = currentConversation.chats[currentConversation.chats.length - 1];
        const aiBindingsCount = currentConversation.aiApplicationBindings.length;

        // 使用公共方法检查是否所有AI都已完成 / Use common method to check if all AIs have completed
        const isAllAiCompleted = areAllAiOutputsComplete(latestChat, aiBindingsCount);

        if (!isAllAiCompleted) {
          showToast({
            message: t('active.error.generating'),
            type: 'error'
          });
          return;
        }
      }

      // 创建空会话（不绑定任何 AI 应用） / Create empty conversation (no AI applications bound)
      const newConv = await createConversation([]);
      navigate(`/conversation/${newConv.conversationId}`, { replace: true });
      await handleSelectConversation(newConv.conversationId);
      showToast({ message: t('session.createSuccess'), type: 'success' });
    } catch (error) {
      console.error('创建会话失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('session.createFailed');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  // 删除会话 / Delete conversation
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId);
      setDeleteConfirmId(null);
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        navigate('/', { replace: true });
      }
      showToast({ message: t('session.archiveSuccess'), type: 'success' });
    } catch (error) {
      console.error('删除会话失败:', error);
      showToast({ message: t('session.archiveFailed'), type: 'error' });
    }
  };

  // 编辑会话 / Edit conversation
  const handleEditConversation = (conversationId: string) => {
    setEditingConversationId(conversationId);
    setIsEditModalOpen(true);
  };

  // 保存编辑 / Save edit
  const handleSaveEdit = async (conversationName: string, description: string) => {
    if (!editingConversationId) return;

    try {
      await window.electronAPI.conversations.updateMetadata(editingConversationId, {
        conversationName,
        description
      });

      // 重新加载会话列表 / Reload conversation list
      await loadConversations();

      // 如果编辑的是当前会话，刷新当前会话
      // If editing current conversation, refresh it
      if (selectedConversationId === editingConversationId) {
        await selectConversation(editingConversationId);
      }

      setIsEditModalOpen(false);
      setEditingConversationId(null);
      showToast({ message: t('session.updateSuccess'), type: 'success' });
    } catch (error) {
      console.error('编辑会话失败:', error);
      showToast({ message: t('session.updateFailed'), type: 'error' });
      throw error; // 重新抛出错误以便模态框保持打开
    }
  };

  // 导出会话 / Export conversation
  const handleExportConversation = async (conversationId: string) => {
    console.log('📤 点击导出会话 / Click export conversation:', conversationId);
    try {
      // 检查 API 是否可用 / Check if API is available
      if (!window.electronAPI?.export?.exportConversation) {
        console.error('❌ 导出 API 不可用 / Export API not available');
        showToast({ message: t('session.exportFailed'), type: 'error' });
        return;
      }

      console.log('📤 调用导出 API / Calling export API...');
      // 调用导出 API，会弹出文件保存对话框 / Call export API, will show save file dialog
      const result = await window.electronAPI.export.exportConversation(conversationId, 'markdown');
      console.log('✅ 导出 API 返回 / Export API returned:', result);

      // 检查是否用户取消 / Check if user canceled
      if (result && result.canceled) {
        console.log('⏹️ 用户取消导出 / User canceled export');
        return;
      }

      // 导出成功 / Export success
      if (result && result.success) {
        showToast({ message: t('session.exportSuccess', { path: result.filePath }), type: 'success' });
      }
    } catch (error) {
      console.error('❌ 导出会话失败 / Export conversation failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('session.exportFailed');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  // 归档会话 / Archive conversation
  const handleArchiveConversation = async (conversationId: string) => {
    try {
      await window.electronAPI.archive.archive(conversationId);

      // 如果归档的是当前选中的会话，清除选中状态
      // If archiving current conversation, clear selection
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
        navigate('/', { replace: true });
      }

      // 重新加载会话列表 / Reload conversation list
      await loadConversations();
      showToast({ message: t('session.archiveSuccess'), type: 'success' });
    } catch (error) {
      console.error('归档会话失败:', error);
      showToast({ message: t('session.archiveFailed'), type: 'error' });
    }
  };

  // 发送消息 / Send message
  const handleSendMessage = async (content: string) => {
    if (!currentConversation) {
      showToast({ message: t('session.selectFirst'), type: 'error' });
      return;
    }

    // 🔥 新增：立即设置本地加载状态 / Set local loading state immediately
    setLocalLoadingState({
      type: 'normal',
      conversationId: currentConversation.conversationId
    });

    try {
      await sendMessage(content);
      showToast({ message: t('toast.messageSent'), type: 'success' });
      // 🔥 注意：不清除本地状态，让轮询来清除状态
      // Note: Don't clear local state here, let polling clear it
    } catch (error) {
      console.error('发送消息失败:', error);
      // 🔥 失败时清除本地状态 / Clear local state on failure
      setLocalLoadingState({ type: null, conversationId: null });
      showToast({ message: t('session.sendFailed'), type: 'error' });
    }
  };

  // 🔥 【新增】处理生成总结（带行动限制校验）
  // 🔥 【New】Handle generate summary (with action restriction validation)
  const handleGenerateSummary = async (chatId: string) => {
    // 🔥 校验1：检查本地是否有活跃会话 / Check if there's a local active session
    if (localLoadingState.type !== null) {
      const conversationId = localLoadingState.conversationId || '未知';
      let messageKey = '';
      if (localLoadingState.type === 'normal') {
        messageKey = 'active.newSummary.normal';
      } else if (localLoadingState.type === 'title') {
        messageKey = 'active.newSummary.title';
      } else if (localLoadingState.type === 'summary') {
        messageKey = 'active.newSummary.summary';
      }

      showToast({ message: t(messageKey).replace('{conversationId}', conversationId), type: 'error' });
      return;
    }

    // 🔥 校验2：检查当前会话的最新一轮是否所有AI都已完成
    if (!currentConversation || currentConversation.chats.length === 0) {
      showToast({ message: t('chat.noMessages'), type: 'warning' });
      return;
    }

    const latestChat = currentConversation.chats[currentConversation.chats.length - 1];
    const aiBindingsCount = currentConversation.aiApplicationBindings.length;
    const isAllAiCompleted = areAllAiOutputsComplete(latestChat, aiBindingsCount);

    if (!isAllAiCompleted) {
      showToast({ message: t('active.error.summarizing'), type: 'error' });
      return;
    }

    // 🔥 立即设置本地加载状态 / Set local loading state immediately
    setLocalLoadingState({
      type: 'summary',
      conversationId: currentConversation.conversationId
    });

    try {
      await window.electronAPI.conversations.generateSummary(currentConversation.conversationId, chatId);
      showToast({ message: t('chat.generatingSummary'), type: 'info' });
      // 🔥 注意：不清除本地状态，让元数据更新事件来清除
      // Note: Don't clear local state here, let metadata update event clear it
    } catch (error) {
      // 🔥 失败时清除本地状态 / Clear local state on failure
      setLocalLoadingState({ type: null, conversationId: null });
      console.error('生成总结失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('chat.generateSummaryFailed');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  // 过滤会话 - 支持搜索标题、会话ID（描述暂时不搜索）
  // Filter conversations - support searching by title, conversation ID (description search deferred)
  const filteredConversations = conversations.filter(conv => {
    const query = searchQuery.toLowerCase().trim();

    // 如果搜索为空，显示所有会话
    // If search is empty, show all conversations
    if (!query) {
      return true;
    }

    // 搜索会话标题
    // Search by conversation title
    if (conv.conversationName.toLowerCase().includes(query)) {
      return true;
    }

    // 搜索会话ID
    // Search by conversation ID
    if (conv.conversationId.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });

  // 按更新时间排序
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );

  return (
    <div className="h-screen w-full flex">
      {/* 左侧会话列表 */}
      <div className="w-80 flex flex-col bg-bg-secondary border-r border-border-secondary">
        {/* Header */}
        <div className="p-4 border-b border-border-secondary">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-text-primary">{t('session.title')}</h1>
            {/* 刷新按钮 / Refresh button */}
            <button
              onClick={() => loadConversations()}
              className="p-2 rounded-lg hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              title={t('archive.refreshList')}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={t('session.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-bg-tertiary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* 新建会话按钮 */}
          <button
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('session.newChat')}
          </button>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-text-secondary">
              {t('session.loading')}
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-tertiary">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">{t('session.noConversations')}</p>
            </div>
          ) : (
            sortedConversations.map((conv) => (
              <ConversationItem
                key={conv.conversationId}
                conversation={conv}
                onClick={() => handleSelectConversation(conv.conversationId)}
                onDelete={() => setDeleteConfirmId(conv.conversationId)}
                onEdit={() => handleEditConversation(conv.conversationId)}
                onExport={() => handleExportConversation(conv.conversationId)}
                onArchive={() => handleArchiveConversation(conv.conversationId)}
                isSelected={selectedConversationId === conv.conversationId}
                aiApplications={aiApplications}
              />
            ))
          )}
        </div>

        {/* 底部按钮区 / Bottom buttons area */}
        <div className="p-3 border-t border-border-secondary">
          <div className="flex gap-2">
            {/* 设置按钮 / Settings button */}
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              title={t('settings.title')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{t('settings.title')}</span>
            </button>

            {/* 归档按钮 / Archive button */}
            <button
              onClick={() => setIsArchiveModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
              title={t('session.archiveManagement')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{t('session.archive')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col bg-bg-primary">
        {currentConversation ? (
          <>
            {/* 顶部栏 */}
            <header className="flex items-center justify-between px-6 py-4 bg-bg-secondary border-b border-border-secondary">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text-primary">
                  {currentConversation.conversationName}
                </h2>
                {/* AI 应用徽章 / AI application badges */}
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
                          <img
                            src={app.logoContent}
                            alt={app.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent && !parent.querySelector('.fallback-header')) {
                                const fallback = document.createElement('span');
                                fallback.className = 'fallback-header text-xs font-bold text-text-secondary';
                                fallback.textContent = app.shortName;
                                parent.appendChild(fallback);
                              }
                            }}
                          />
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </header>

            {/* 消息区域 */}
            {currentConversation.chats.length > 0 ? (
              <>
                <div className="flex-1 flex overflow-hidden">
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
                                // 🔥 移除 title 属性，避免系统默认 tooltip 与自定义悬浮预览冲突
                                // 🔥 Remove title attribute to avoid conflict between system tooltip and custom preview
                                aria-label={message.role === 'summary'
                                  ? `${t('session.summary')}: ${getPreview(message.content, 50)}`
                                  : `${aiApplications.find(a => a.id === message.sender)?.name || 'AI'}: ${getPreview(message.content, 50)}`
                                }
                              />
                              {/* 悬浮预览 */}
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-3">
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
                              // 🔥 移除 title 属性，使用 aria-label 保留无障碍访问
                              // 🔥 Remove title attribute, use aria-label for accessibility
                              aria-label={message.role === 'summary'
                                ? `${t('session.summary')}: ${getPreview(message.content, 50)}`
                                : `${appName}: ${getPreview(message.content, 50)}`
                              }
                            />
                            {/* 悬浮预览 */}
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                              <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-3">
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
                          onGenerateSummary={() => handleGenerateSummary(chat.chatId)}
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
                            // 🔥 移除 title 属性，使用 aria-label 保留无障碍访问
                            // 🔥 Remove title attribute, use aria-label for accessibility
                            aria-label={getPreview(userMessage.content)}
                          />
                          {/* 悬浮预览 */}
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <p className="text-xs text-gray-700 dark:text-gray-200 line-clamp-3">
                              {getPreview(userMessage.content)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center overflow-y-auto">
                <div className="w-full px-6 py-8">
                  {/* 外层居中容器 */}
                  <div className="max-w-5xl mx-auto text-center">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-text-primary mb-2">
                        {t('welcome.selectAI')}
                      </h3>
                      <p className="text-text-secondary">
                        {t('welcome.selectAIDesc')}
                      </p>
                    </div>

                    {/* AI 应用选择网格 */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8 text-left">
                        {aiApplications
                          .filter(app => app.isEnabled)
                          .map(app => {
                            // 🔥 使用本地状态判断是否选中 / Use local state to check if selected
                            const isSelected = localSelectedAiApps.has(app.id);
                            const isProcessing = togglingAiApp === app.id;
                            return (
                              <button
                                key={app.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // 🔥 调用稳定的处理函数 / Call stable handler function
                                  handleToggleAiApp(app.id);
                                }}
                                disabled={isProcessing}
                                className={cn(
                                  'relative p-4 rounded-xl border-2 transition-all duration-200',
                                  'flex flex-col items-center gap-3 hover:shadow-lg',
                                  'disabled:opacity-50 disabled:cursor-not-allowed',
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-border-secondary bg-bg-secondary hover:border-blue-300 dark:hover:border-blue-700'
                                )}
                                title={app.description}
                              >
                                {/* 右上角选中标记 / Selection indicator at top-right */}
                                {isSelected && (
                                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

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
                                </div>
                              </button>
                            );
                          })}
                      </div>

                      {/* 提示信息 */}
                      <div className="text-sm text-text-tertiary inline-block">
                        {localSelectedAiApps.size === 0
                          ? t('welcome.selectAtLeastOne')
                          : t('welcome.readyToStart', { count: localSelectedAiApps.size })
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* 输入区域 / Input area */}
            <div className="p-4 border-t border-border-secondary">
              {/* 🔥 内部任务加载指示器（基于本地状态） / Internal task loading indicator (based on local state) */}
              {localLoadingState.type !== null && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 mb-2">
                  <InlineLoading />
                  <span className="text-sm text-text-secondary">
                    {(() => {
                      // 🔥 判断是否为当前会话，显示"本会话"或完整会话ID
                      // 🔥 Check if it's current conversation, show "本会话" or full conversationId
                      const isActiveCurrent = currentConversation?.conversationId === localLoadingState.conversationId;
                      const displayConversationId = isActiveCurrent ? t('common.thisSession') : (localLoadingState.conversationId || '');

                      let messageKey = '';
                      if (localLoadingState.type === 'normal') {
                        messageKey = 'active.normal';
                      } else if (localLoadingState.type === 'title') {
                        messageKey = 'active.title';
                      } else if (localLoadingState.type === 'summary') {
                        messageKey = 'active.summary';
                      }
                      return t(messageKey).replace('{conversationId}', displayConversationId);
                    })()}
                  </span>
                </div>
              )}
              <MessageInput
                onSend={handleSendMessage}
                disabled={
                  !currentConversation ||
                  localSelectedAiApps.size === 0 ||
                  localLoadingState.type !== null ||
                  // 🔥 检查最新一轮是否所有AI都已完成
                  (currentConversation.chats.length > 0 &&
                   !areAllAiOutputsComplete(
                     currentConversation.chats[currentConversation.chats.length - 1],
                     localSelectedAiApps.size
                   ))
                }
              />
            </div>
          </>
        ) : (
          /* 欢迎区域 */
          <div className="flex-1 flex items-center justify-center bg-bg-primary">
            <div className="text-center max-w-md">
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 rounded-2xl bg-blue-600 flex items-center justify-center shadow-2xl">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">
                {t('welcome.title')}
              </h2>
              <p className="text-text-secondary mb-6">
                {t('welcome.subtitle')}
              </p>
              <button
                onClick={handleCreateConversation}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-lg shadow-blue-500/30"
              >
                {t('welcome.startChat')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 编辑会话模态框 */}
      {editingConversationId && (
        <EditConversationModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingConversationId(null);
          }}
          onSave={handleSaveEdit}
          initialName={conversations.find(c => c.conversationId === editingConversationId)?.conversationName || ''}
          initialDescription={conversations.find(c => c.conversationId === editingConversationId)?.description || ''}
        />
      )}

      {/* 设置模态框 */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* 归档管理模态框 */}
      <ArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
      />

      {/* 删除确认 */}
      <ConfirmModal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDeleteConversation(deleteConfirmId)}
        title={t('session.delete')}
        message={t('toast.confirmDelete')}
        confirmText={t('session.delete')}
        cancelText={t('toast.cancel')}
        variant="danger"
      />

      {/* Toast 通知 */}
      <ToastContainer />
    </div>
  );
}

/**
 * 会话项组件属性 / Conversation item component props
 */
interface ConversationItemProps {
  /** 会话数据 / Conversation data */
  conversation: Conversation;
  /** 点击回调 / Click callback */
  onClick: () => void;
  /** 删除回调 / Delete callback */
  onDelete: () => void;
  /** 编辑回调 / Edit callback */
  onEdit: () => void;
  /** 导出回调 / Export callback */
  onExport: () => void;
  /** 归档回调 / Archive callback */
  onArchive: () => void;
  /** 是否选中 / Is selected */
  isSelected?: boolean;
  /** AI 应用列表 / AI applications list */
  aiApplications: any[];
}

/**
 * 会话项组件 / Conversation item component
 * 显示会话列表中的单个会话卡片 / Display single conversation card in list
 */
function ConversationItem({ conversation, onClick, onDelete, onEdit, onExport, onArchive, isSelected = false, aiApplications }: ConversationItemProps) {
  const { t } = useLanguage();

  /**
   * 格式化日期为 yyyy-mm-dd / Format date as yyyy-mm-dd
   */
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * 构建更多操作菜单项 / Build more actions menu items
   */
  const menuItems: MenuItem[] = [
    {
      key: 'edit',
      label: t('session.edit'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: onEdit,
    },
    {
      key: 'export',
      label: t('session.export'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      onClick: onExport,
    },
    {
      key: 'archive',
      label: t('session.archiveAction'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      onClick: onArchive,
    },
    {
      key: 'delete',
      label: t('session.delete'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: onDelete,
      variant: 'danger',
    },
  ];

  return (
    <div
      className={cn(
        "group p-3 rounded-xl cursor-pointer transition-all duration-200",
        isSelected ? "bg-bg-tertiary" : "hover:bg-bg-tertiary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-text-primary truncate flex-1">
          {conversation.conversationName}
        </h3>

        {/* 更多操作按钮 - 悬浮时显示 / More actions button - show on hover */}
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()} // 防止触发卡片点击 / Prevent card click
        >
          <DropdownMenu
            trigger={
              <button
                className="p-1 rounded hover:bg-bg-tertiary text-text-tertiary hover:text-text-primary transition-all"
                title={t('session.moreActions')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            }
            items={menuItems}
            align="right"
            triggerMode="both" // 🔥 同时支持点击和悬停触发 / Support both click and hover trigger
          />
        </div>
      </div>

      {/* 描述 - 灰色字，三行，超出省略 / Description - gray text, 3 lines, truncate */}
      {conversation.description ? (
        <p className="text-sm text-text-tertiary mb-2 line-clamp-3">
          {conversation.description}
        </p>
      ) : (
        <p className="text-sm text-text-tertiary mb-2 line-clamp-3 italic">
          {t('session.noDescription')}
        </p>
      )}

      {/* 创建日期 - yyyy-mm-dd / Creation date - yyyy-mm-dd */}
      <div className="text-xs text-text-tertiary">
        {formatDate(conversation.createTime)}
      </div>
    </div>
  );
}
