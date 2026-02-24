/**
 * 会话状态管理
 */

import { create } from 'zustand';
import type { Conversation, Message, AiApplication } from '@shared';

interface ConversationStore {
  // 状态
  conversations: Conversation[];
  currentConversation: Conversation | null;
  selectedAiApplications: string[];
  isLoading: boolean;

  // 操作
  loadConversations: () => Promise<void>;
  createConversation: (aiApplicationIds: string[]) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  generateSummary: (chatId: string) => Promise<void>;
  updateMetadata: (conversationId: string, metadata: {
    conversationName?: string;
    description?: string;
  }) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  setSelectedAiApplications: (ids: string[]) => void;

  // UI 状态
  displayMode: 'horizontal' | 'vertical';
  setDisplayMode: (mode: 'horizontal' | 'vertical') => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // 初始状态 / Initial state
  conversations: [],
  currentConversation: null,
  selectedAiApplications: [],
  isLoading: false,
  displayMode: 'vertical', // 默认竖排显示 / Default vertical display mode

  // 加载会话列表
  loadConversations: async () => {
    console.log('📂 开始加载会话列表...');
    set({ isLoading: true });
    try {
      console.log('📡 调用 electronAPI.conversations.list()');
      const conversations = await window.electronAPI.conversations.list();
      console.log('✅ 会话列表加载成功:', conversations);
      console.log(`   共 ${conversations.length} 个会话`);
      set({ conversations, isLoading: false });
    } catch (error) {
      console.error('❌ 加载会话失败:', error);
      console.error('   错误详情:', error instanceof Error ? error.message : String(error));
      set({ isLoading: false });
    }
  },

  // 创建新会话
  // 🔥 【修改】新建会话不创建活跃文件，只创建空会话
  // 🔥 【Modified】Create conversation doesn't create active session, only empty conversation
  createConversation: async (aiApplicationIds: string[]) => {
    console.log('🆕 开始创建会话，AI应用:', aiApplicationIds);
    set({ isLoading: true });

    try {
      // 🔥 【修改】直接创建空会话，不进行预分配（不创建活跃文件）
      // 🔥 【Modified】Directly create empty conversation, no reservation (no active session file)
      console.log('📡 调用 electronAPI.conversations.create(null, aiApplicationIds)');
      const conversation = await window.electronAPI.conversations.create(null, aiApplicationIds);
      console.log('✅ IPC 调用完成，返回值:', conversation);

      if (!conversation) {
        throw new Error('创建会话返回值为空');
      }

      console.log('✅ 会话创建成功，更新状态');
      set(state => ({
        conversations: [conversation, ...state.conversations],
        currentConversation: conversation,
        selectedAiApplications: aiApplicationIds,
        isLoading: false
      }));
      return conversation;
    } catch (error) {
      console.error('❌ 创建会话失败:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // 选择会话
  selectConversation: async (id: string) => {
    console.log('📌 选择会话:', id);
    set({ isLoading: true });
    try {
      const conversation = await window.electronAPI.conversations.get(id);
      console.log('✅ 会话加载成功:', conversation);
      set({
        currentConversation: conversation || null,
        isLoading: false
      });
    } catch (error) {
      console.error('❌ 选择会话失败:', error);
      set({ isLoading: false });
    }
  },

  // 发送消息
  sendMessage: async (content: string) => {
    const { currentConversation } = get();
    if (!currentConversation) throw new Error('未选择会话');

    try {
      // 调用后端发送消息，获取更新后的会话
      // Call backend to send message and get updated conversation
      const updatedConversation = await window.electronAPI.conversations.sendMessage(currentConversation.conversationId, content);

      // 更新前端状态，使用后端返回的最新会话数据
      // Update frontend state with latest conversation data from backend
      console.log('📦 收到更新后的会话，聊天数量:', updatedConversation.chats.length);
      const latestChat = updatedConversation.chats[updatedConversation.chats.length - 1];
      if (latestChat) {
        console.log('📦 最新聊天消息数:', latestChat.messages.length);
        latestChat.messages.forEach((msg, idx) => {
          console.log(`📦 消息 ${idx}: role=${msg.role}, sender=${msg.sender}, content长度=${msg.content?.length || 0}, status=${msg.status}`);
          if (msg.content && msg.content.length > 0) {
            console.log(`📦 消息 ${idx} 内容预览（前200字符）:`, msg.content.substring(0, 200));
            console.log(`📦 消息 ${idx} 内容预览（后200字符）:`, msg.content.substring(Math.max(0, msg.content.length - 200)));
          }
        });
      }
      set(state => ({
        currentConversation: updatedConversation,
        // 同时更新会话列表中的对应会话
        // Also update corresponding conversation in the list
        conversations: state.conversations.map(c =>
          c.conversationId === updatedConversation.conversationId ? updatedConversation : c
        )
      }));

      console.log('✅ 消息发送成功，会话已更新');
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      throw error;
    }
  },

  // 生成总结
  generateSummary: async (chatId: string) => {
    const { currentConversation } = get();
    if (!currentConversation) throw new Error('未选择会话');

    await window.electronAPI.conversations.generateSummary(currentConversation.conversationId, chatId);
  },

  // 更新会话元数据
  updateMetadata: async (conversationId: string, metadata) => {
    await window.electronAPI.conversations.updateMetadata(conversationId, metadata);
    // 重新加载会话
    await get().selectConversation(conversationId);
  },

  // 删除会话
  deleteConversation: async (conversationId: string) => {
    await window.electronAPI.conversations.delete(conversationId);
    set(state => ({
      conversations: state.conversations.filter(c => c.conversationId !== conversationId),
      currentConversation: state.currentConversation?.conversationId === conversationId ? null : state.currentConversation
    }));
  },

  // 设置选中的 AI 应用
  setSelectedAiApplications: (ids: string[]) => {
    set({ selectedAiApplications: ids });
  },

  // 设置显示模式
  setDisplayMode: (mode: 'horizontal' | 'vertical') => {
    console.log('🔄 setDisplayMode 被调用 / setDisplayMode called:', mode);
    set({ displayMode: mode });
  }
}));
