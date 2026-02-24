/**
 * ArchiveModal - 归档管理模态框组件
 * Archive management modal component
 */

import { useState, useEffect } from 'react';
import { Modal } from '@renderer/components/ui/Modal';
import { cn } from '@shared';
import type { Conversation } from '@shared';
import { showToast } from '@renderer/components/ui/Toast';
import { useLanguage } from '@renderer/contexts/LanguageContext';

export interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchiveModal({ isOpen, onClose }: ArchiveModalProps) {
  const { t, language } = useLanguage();

  // 归档列表状态 / Archive list state
  const [archivedConversations, setArchivedConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 搜索状态 / Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 分页状态 / Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 编辑状态 / Edit state
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  /**
   * 加载归档列表 / Load archived conversations list
   */
  const loadArchivedConversations = async () => {
    setIsLoading(true);
    try {
      const archived = await window.electronAPI.archive.list();
      setArchivedConversations(archived);
    } catch (error) {
      console.error('加载归档列表失败:', error);
      showToast({ message: t('archive.loadFailed'), type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 打开归档文件 / Open archived file
   */
  const handleOpenArchive = async (conversationId: string) => {
    console.log('📂 点击打开归档:', conversationId);
    try {
      if (!window.electronAPI?.archive?.open) {
        console.error('❌ 归档打开 API 不可用');
        showToast({ message: t('archive.openUnavailable'), type: 'error' });
        return;
      }

      await window.electronAPI.archive.open(conversationId);
      console.log('✅ 成功打开归档');
    } catch (error) {
      console.error('❌ 打开文件失败:', error);
      const errorMessage = error instanceof Error ? error.message : t('archive.openFailed');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  /**
   * 删除归档 / Delete archive
   */
  const handleDeleteArchive = async (conversationId: string) => {
    try {
      if (!confirm(t('archive.confirmDelete'))) {
        return;
      }

      await window.electronAPI.archive.delete(conversationId);
      await loadArchivedConversations();
      showToast({ message: t('archive.deleteSuccess'), type: 'success' });
    } catch (error) {
      console.error('删除归档失败:', error);
      showToast({ message: t('archive.deleteFailed'), type: 'error' });
    }
  };

  /**
   * 导出归档 / Export archive
   */
  const handleExportArchive = async (conversationId: string) => {
    console.log('📤 点击导出归档 / Click export archive:', conversationId);
    try {
      if (!window.electronAPI?.export?.exportConversation) {
        console.error('❌ 导出 API 不可用 / Export API not available');
        showToast({ message: t('archive.exportUnavailable'), type: 'error' });
        return;
      }

      console.log('📤 调用导出 API / Calling export API...');
      const result = await window.electronAPI.export.exportConversation(conversationId, 'markdown');
      console.log('✅ 导出 API 返回 / Export API returned:', result);

      if (result && result.canceled) {
        console.log('⏹️ 用户取消导出 / User canceled export');
        return;
      }

      if (result && result.success) {
        showToast({ message: t('session.exportSuccess', { path: result.filePath }), type: 'success' });
      }
    } catch (error) {
      console.error('❌ 导出归档失败 / Export archive failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('archive.exportFailed');
      showToast({ message: errorMessage, type: 'error' });
    }
  };

  /**
   * 打开编辑归档对话框 / Open edit archive dialog
   */
  const handleEditArchive = (conversation: Conversation) => {
    setEditingConversationId(conversation.conversationId);
    setEditName(conversation.conversationName);
    setEditDescription(conversation.description || '');
    setIsEditModalOpen(true);
  };

  /**
   * 保存编辑归档 / Save edit archive
   */
  const handleSaveEdit = async () => {
    if (!editingConversationId) return;

    setIsSaving(true);
    try {
      await window.electronAPI.conversations.updateMetadata(editingConversationId, {
        conversationName: editName,
        description: editDescription
      });

      await loadArchivedConversations();
      setIsEditModalOpen(false);
      setEditingConversationId(null);
      showToast({ message: t('archive.updated'), type: 'success' });
    } catch (error) {
      console.error('编辑归档失败 / Edit archive failed:', error);
      const errorMessage = error instanceof Error ? error.message : t('archive.updateFailed');
      showToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 取消编辑 / Cancel edit
   */
  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingConversationId(null);
    setEditName('');
    setEditDescription('');
  };

  /**
   * 格式化日期 / Format date
   */
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * 过滤归档列表 / Filter archived list
   * 支持搜索标题和会话ID（描述搜索暂不实现）
   * Support searching by title and conversation ID (description search deferred)
   */
  const filteredConversations = archivedConversations.filter((conv) => {
    // 关键词搜索 - 标题和ID / Keyword search - title and ID
    if (searchQuery) {
      const query = searchQuery.toLowerCase().trim();
      const matchesName = conv.conversationName.toLowerCase().includes(query);
      const matchesId = conv.conversationId.toLowerCase().includes(query);

      if (!matchesName && !matchesId) {
        return false;
      }
    }

    // 日期范围过滤 / Date range filter
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (conv.createTime < start) {
        return false;
      }
    }

    if (endDate) {
      const end = new Date(endDate).setHours(23, 59, 59, 999);
      if (conv.createTime > end) {
        return false;
      }
    }

    return true;
  });

  // 排序（按创建时间倒序）/ Sort by creation time (desc)
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => b.createTime - a.createTime
  );

  // 分页 / Pagination
  const totalPages = Math.ceil(sortedConversations.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedConversations = sortedConversations.slice(startIndex, endIndex);

  // 当模态框打开时加载列表 / Load list when modal opens
  useEffect(() => {
    if (isOpen) {
      loadArchivedConversations();
    }
  }, [isOpen]);

  // 搜索或过滤变化时重置到第一页 / Reset to first page when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, startDate, endDate]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('archive.title')}
      size="2xl"
      footer={null}
    >
      <div className="flex flex-col h-[60vh]">
        {/* 🔥 固定顶部：搜索栏 + 统计信息 / Fixed top: Search bar + Statistics */}
        <div className="flex-shrink-0 space-y-3 pb-3 border-b border-border-secondary">
          {/* 搜索栏 / Search bar */}
          <div className="space-y-3">
            <div className="flex gap-3">
              {/* 关键词搜索 / Keyword search */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder={t('archive.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>

              {/* 日期范围搜索 / Date range search */}
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder={t('archive.startDate')}
                />
                <span className="flex items-center text-text-secondary">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder={t('archive.endDate')}
                />
              </div>

              {/* 刷新按钮 / Refresh button */}
              <button
                onClick={loadArchivedConversations}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('archive.refreshList')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* 清除筛选按钮 / Clear filters button */}
            {(searchQuery || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {t('archive.clearFilters')}
              </button>
            )}
          </div>

          {/* 统计信息 / Statistics */}
          <div className="text-sm text-text-secondary">
            {language === 'zh'
              ? t('archive.total', { count: sortedConversations.length }) + (searchQuery || startDate || endDate ? ` (${t('archive.filtered')})` : '')
              : t('archive.total', { count: sortedConversations.length }) + (searchQuery || startDate || endDate ? ` (${t('archive.filtered')})` : '')
            }
          </div>
        </div>

        {/* 🔥 可滚动区域：卡片列表 + 分页 / Scrollable area: Cards list + Pagination */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* 归档卡片列表 / Archive cards list */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-text-secondary">
                {t('archive.loading')}
              </div>
            </div>
          ) : paginatedConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-border-secondary rounded-lg">
              <svg className="w-16 h-16 text-text-tertiary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <p className="text-text-tertiary">
                {t('archive.empty')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedConversations.map((conv) => (
                <div
                  key={conv.conversationId}
                  className="p-4 rounded-lg border border-border-secondary bg-bg-secondary hover:bg-bg-tertiary transition-colors"
                >
                  {/* 卡片头部 / Card header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h4 className="flex-1 text-sm font-medium text-text-primary line-clamp-2">
                      {conv.conversationName}
                    </h4>
                    <div className="flex gap-1">
                      {/* 打开按钮 / Open button */}
                      <button
                        onClick={() => handleOpenArchive(conv.conversationId)}
                        className="p-1.5 rounded hover:bg-bg-tertiary text-blue-600 hover:text-blue-700 transition-colors"
                        title={t('archive.openFile')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {/* 导出按钮 / Export button */}
                      <button
                        onClick={() => handleExportArchive(conv.conversationId)}
                        className="p-1.5 rounded hover:bg-bg-tertiary text-green-600 hover:text-green-700 transition-colors"
                        title={t('archive.exportArchive')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </button>
                      {/* 编辑按钮 / Edit button */}
                      <button
                        onClick={() => handleEditArchive(conv)}
                        className="p-1.5 rounded hover:bg-bg-tertiary text-amber-600 hover:text-amber-700 transition-colors"
                        title={t('archive.editArchive')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* 删除按钮 / Delete button */}
                      <button
                        onClick={() => handleDeleteArchive(conv.conversationId)}
                        className="p-1.5 rounded hover:bg-bg-tertiary text-red-600 hover:text-red-700 transition-colors"
                        title={t('archive.deleteArchive')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* 描述 / Description */}
                  {conv.description && (
                    <p className="text-xs text-text-secondary mb-3 line-clamp-3">
                      {conv.description}
                    </p>
                  )}

                  {/* 信息 / Info */}
                  <div className="space-y-1 text-xs text-text-tertiary">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('archive.id')}:</span>
                      <span className="font-mono truncate">{conv.conversationId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {t('archive.created')}
                      </span>
                      <span>{formatDate(conv.createTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {t('archive.archived')}
                      </span>
                      <span>{formatDate(conv.updateTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分页控件 / Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-border-secondary">
              <div className="text-sm text-text-secondary">
                {t('archive.pageInfo', { current: currentPage, total: totalPages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('archive.previous')}
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {t('archive.next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 🔥 固定底部：提示信息 / Fixed bottom: Hint */}
        <div className="flex-shrink-0 pt-3 border-t border-border-secondary">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 {t('archive.hint')}
            </p>
          </div>
        </div>
      </div>

      {/* 编辑归档对话框 / Edit archive dialog */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-primary rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {t('archive.editTitle')}
            </h3>
            <div className="space-y-4">
              {/* 名称输入 / Name input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('archive.name')}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder={t('archive.namePlaceholder')}
                />
              </div>
              {/* 描述输入 / Description input */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {t('archive.description')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                  placeholder={t('archive.descriptionPlaceholder')}
                />
              </div>
            </div>
            {/* 操作按钮 / Action buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-text-secondary"
              >
                {t('archive.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving || !editName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? t('archive.saving') : t('archive.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
