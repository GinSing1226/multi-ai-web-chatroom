/**
 * 存储服务
 * 负责会话文件的读写、归档管理
 */

import * as path from 'path';
import { app } from 'electron';
import matter from 'gray-matter';
import type { Conversation, Chat, Message } from '@shared/types/conversation.types';
import type { MessageStatus } from '@shared/types/message.types';
import { generateConversationId, generateChatId, generateMessageId } from '@shared/utils/id-generator';
import { conversationToMarkdown, formatTimestamp } from '@shared/utils/conversation.util';
import { ensureDir, readFile, writeFile, deleteFile, listFiles, fileExists, generateConversationFilename, sanitizeFilename, renameFile } from '@shared/utils/file.util';
import { logService, LogModule } from './log.service';

/**
 * 存储服务类
 */
export class StorageService {
  private sessionsDir: string = '';
  private archivedDir: string = '';
  private internalDir: string = '';  // 🔥 新增：内部任务临时文件目录 / New: Internal task temporary file directory
  private initialized = false;

  constructor() {
    // 延迟初始化
  }

  /**
   * 初始化存储服务
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // 使用项目根目录的 data 文件夹
    // 在开发环境中，process.cwd() 指向项目根目录
    const projectRoot = process.cwd();
    this.sessionsDir = path.join(projectRoot, 'data', 'sessions');
    this.archivedDir = path.join(projectRoot, 'data', 'archived');
    this.internalDir = path.join(projectRoot, 'data', 'conversations', 'internal');  // 🔥 新增 / New

    logService.info('storage', `Storage directories: sessions=${this.sessionsDir}, archived=${this.archivedDir}, internal=${this.internalDir}`);

    // 确保目录存在
    await this.ensureDirectories();
    this.initialized = true;
  }

  /**
   * 确保存储目录存在
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await ensureDir(this.sessionsDir);
      await ensureDir(this.archivedDir);
      await ensureDir(this.internalDir);  // 🔥 新增 / New
    } catch (error) {
      logService.error('storage', '创建存储目录失败 / Failed to create storage directories', error);
    }
  }

  /**
   * 获取会话文件路径 / Get conversation file path
   * @param conversation 会话对象或会话ID / Conversation object or ID
   * @returns 文件完整路径 / Full file path
   */
  getConversationFilePath(conversation: Conversation | string): string {
    if (typeof conversation === 'string') {
      // 兼容旧逻辑：如果只传入 ID，使用简单命名
      // Backward compatibility: if only ID provided, use simple naming
      return path.join(this.sessionsDir, `${conversation}.md`);
    }

    // 新逻辑：使用 标题_id_yyyy-mm-dd 格式
    // New logic: use title_id_yyyy-mm-dd format
    const filename = generateConversationFilename(
      conversation.conversationName,
      conversation.conversationId,
      conversation.createTime
    );
    return path.join(this.sessionsDir, `${filename}.md`);
  }

  /**
   * 获取归档文件路径 / Get archived file path
   * @param conversation 会话对象或会话ID / Conversation object or ID
   * @returns 归档文件完整路径 / Full archived file path
   */
  getArchivedFilePath(conversation: Conversation | string): string {
    if (typeof conversation === 'string') {
      // 兼容旧逻辑：如果只传入 ID，使用简单命名
      // Backward compatibility: if only ID provided, use simple naming
      return path.join(this.archivedDir, `${conversation}.md`);
    }

    // 新逻辑：使用 标题_id_yyyy-mm-dd 格式
    // New logic: use title_id_yyyy-mm-dd format
    const filename = generateConversationFilename(
      conversation.conversationName,
      conversation.conversationId,
      conversation.createTime
    );
    return path.join(this.archivedDir, `${filename}.md`);
  }

  /**
   * 🔥 新增：通过 conversationId 查找实际归档文件路径
   * 🔥 New: Find actual archived file path by conversationId
   * 因为文件名可能包含标题和日期，需要在目录中搜索匹配的文件
   * Because filename may include title and date, need to search for matching file in directory
   * @param conversationId 会话ID / Conversation ID
   * @returns 文件完整路径，如果找不到返回 null / Full file path, or null if not found
   */
  async findArchivedFilePath(conversationId: string): Promise<string | null> {
    await this.initialize();
    try {
      const files = await listFiles(this.archivedDir, '.md');

      for (const file of files) {
        const filePath = path.join(this.archivedDir, file);
        try {
          const content = await readFile(filePath);
          const { data } = matter(content);

          // 检查文件中的 conversationId 是否匹配
          // Check if conversationId in file matches
          if (data.conversationId === conversationId) {
            return filePath;
          }
        } catch {
          continue;
        }
      }

      logService.warn('storage', `未找到归档文件: ${conversationId} / Archived file not found`);
      return null;
    } catch (error) {
      logService.error('storage', `查找归档文件失败: ${conversationId} / Failed to find archived file`, error);
      return null;
    }
  }

  /**
   * 加载会话
   * 支持新旧两种文件命名格式
   */
  async loadConversation(conversationId: string): Promise<Conversation | null> {
    await this.initialize();
    try {
      // 首先尝试新格式：在所有文件中查找匹配的 conversationId
      // First try new format: search for matching conversationId in all files
      const files = await listFiles(this.sessionsDir, '.md');

      // 遍历所有文件，查找匹配的 conversationId
      // Iterate all files to find matching conversationId
      for (const file of files) {
        const filePath = path.join(this.sessionsDir, file);
        try {
          const content = await readFile(filePath);
          const { data, content: markdown } = matter(content);

          // 检查文件中的 conversationId 是否匹配
          // Check if conversationId in file matches
          if (data.conversationId === conversationId) {
            // 解析消息内容 / Parse message content
            const chats = this.parseChats(markdown);

            const conversation: Conversation = {
              conversationName: data.conversationName || '未命名会话',
              description: data.description || '',
              conversationId: data.conversationId || conversationId,
              createTime: data.createTime || data.createdAt || Date.now(),
              updateTime: data.updateTime || data.updatedAt || Date.now(),
              aiApplicationBindings: data.aiApplicationBindings || [],
              chats
            };

            logService.info('storage', `加载会话成功: ${conversationId} / Conversation loaded successfully`);
            return conversation;
          }
        } catch (error) {
          // 跳过解析失败的文件 / Skip files that fail to parse
          continue;
        }
      }

      logService.warn('storage', `会话文件不存在: ${conversationId} / Conversation file not found`);
      return null;
    } catch (error) {
      logService.error('storage', `加载会话失败: ${conversationId}`, error);
      return null;
    }
  }

  /**
   * 【更新】保存会话 / 【Updated】Save conversation
   * 如果文件名需要更新，会自动重命名
   *
   * 🔥 【新增】支持内部任务 / 【New】Support internal tasks
   * @param conversation - 会话对象 / Conversation object
   * @param isInternal - 是否为内部任务（默认false）/ Whether it's an internal task (default: false)
   */
  async saveConversation(conversation: Conversation, isInternal = false): Promise<void> {
    await this.initialize();
    try {
      const markdown = conversationToMarkdown(conversation);

      // 🔥 判断保存路径 / Determine save path
      let targetDir = this.sessionsDir;
      if (isInternal) {
        targetDir = this.internalDir;
        logService.info('storage', `🔥 保存内部任务会话到 internal 目录 / Saving internal task conversation to internal directory`);
      }

      // 🔥 根据是否内部任务决定文件路径 / Determine file path based on whether it's an internal task
      let newFilePath: string;
      if (isInternal) {
        // 内部任务使用简单的 conversationId.md 命名
        // Internal tasks use simple conversationId.md naming
        newFilePath = path.join(targetDir, `${conversation.conversationId}.md`);
      } else {
        // 正常会话使用 标题_id_yyyy-mm-dd 格式
        // Normal conversations use title_id_yyyy-mm-dd format
        newFilePath = this.getConversationFilePath(conversation);
      }

      // 检查是否需要重命名文件（旧文件存在但路径不同）
      // Check if file needs to be renamed (old file exists but path is different)
      const files = await listFiles(targetDir, '.md');
      let oldFilePath: string | null = null;

      for (const file of files) {
        const filePath = path.join(targetDir, file);
        try {
          const content = await readFile(filePath);
          const { data } = matter(content);
          if (data.conversationId === conversation.conversationId) {
            oldFilePath = filePath;
            break;
          }
        } catch {
          continue;
        }
      }

      // 如果找到旧文件且路径不同，进行重命名
      // If old file found and path differs, rename it
      if (oldFilePath && oldFilePath !== newFilePath) {
        await renameFile(oldFilePath, newFilePath);
        logService.info('storage', `重命名会话文件: ${path.basename(oldFilePath)} -> ${path.basename(newFilePath)} / Renamed conversation file`);
      }

      // 写入文件
      await writeFile(newFilePath, markdown);

      logService.info('storage', `保存会话成功: ${conversation.conversationId} / Conversation saved successfully`);
    } catch (error) {
      logService.error('storage', `保存会话失败: ${conversation.conversationId} / Failed to save conversation`, error);
      throw error;
    }
  }

  /**
   * 列出所有会话
   * List all conversations
   */
  async listConversations(): Promise<Conversation[]> {
    await this.initialize();
    try {
      logService.debug('storage', `开始列出会话，目录: ${this.sessionsDir}`);
      const files = await listFiles(this.sessionsDir, '.md');
      logService.debug('storage', `找到 ${files.length} 个会话文件: ${files.join(', ')}`);
      const conversations: Conversation[] = [];

      // 遍历所有文件，直接从文件中读取会话数据
      // Iterate all files and read conversation data directly
      for (const file of files) {
        const filePath = path.join(this.sessionsDir, file);
        try {
          const content = await readFile(filePath);
          const { data, content: markdown } = matter(content);

          // 解析消息内容 / Parse message content
          const chats = this.parseChats(markdown);

          const conversation: Conversation = {
            conversationName: data.conversationName || '未命名会话',
            description: data.description || '',
            conversationId: data.conversationId || file.replace('.md', ''),
            createTime: data.createTime || data.createdAt || Date.now(),
            updateTime: data.updateTime || data.updatedAt || Date.now(),
            aiApplicationBindings: data.aiApplicationBindings || [],
            chats
          };

          conversations.push(conversation);
        } catch (error) {
          // 跳过解析失败的文件 / Skip files that fail to parse
          logService.warn('storage', `跳过解析失败的文件: ${file} / Skipping failed file`, error);
          continue;
        }
      }

      // 按创建时间倒序排序 / Sort by create time descending
      conversations.sort((a, b) => b.createTime - a.createTime);

      logService.info('storage', `列出会话成功，共 ${conversations.length} 个 / Listed conversations successfully, total ${conversations.length}`);
      return conversations;
    } catch (error) {
      logService.error('storage', '列出会话失败', error);
      return [];
    }
  }

  /**
   * 删除会话
   * 支持删除活跃会话、归档会话和内部临时会话
   * Supports deleting active, archived, and internal temporary conversations
   */
  async deleteConversation(conversationId: string): Promise<void> {
    await this.initialize();
    try {
      // 🔥 【优化2.0】先检查internal目录（内部任务临时文件）
      // 🔥 【Optimized 2.0】Check internal directory first (internal task temp files)
      if (this.internalDir) {
        const internalFilePath = path.join(this.internalDir, `${conversationId}.md`);
        if (await fileExists(internalFilePath)) {
          await deleteFile(internalFilePath);
          logService.info('storage', `删除内部临时会话文件: ${conversationId} / Internal temp conversation deleted: ${conversationId}`);
          return;
        }
      }

      // 查找匹配的文件（活跃会话）
      // Find matching file (active conversation)
      const files = await listFiles(this.sessionsDir, '.md');
      let filePath: string | null = null;

      for (const file of files) {
        const fullPath = path.join(this.sessionsDir, file);
        try {
          const content = await readFile(fullPath);
          const { data } = matter(content);
          if (data.conversationId === conversationId) {
            filePath = fullPath;
            break;
          }
        } catch {
          continue;
        }
      }

      if (filePath && await fileExists(filePath)) {
        await deleteFile(filePath);
        logService.info('storage', `删除会话成功: ${conversationId} / Conversation deleted successfully`);
      } else {
        logService.warn('storage', `会话文件不存在: ${conversationId} / Conversation file not found`);
      }
    } catch (error) {
      logService.error('storage', `删除会话失败: ${conversationId}`, error);
      throw error;
    }
  }

  /**
   * 归档会话
   */
  async archiveConversation(conversationId: string): Promise<void> {
    await this.initialize();
    try {
      // 先加载会话以获取完整信息
      // Load conversation first to get full info
      const conversation = await this.loadConversation(conversationId);
      if (!conversation) {
        throw new Error('会话文件不存在 / Conversation file not found');
      }

      // 查找源文件
      // Find source file
      const files = await listFiles(this.sessionsDir, '.md');
      let sourcePath: string | null = null;

      for (const file of files) {
        const fullPath = path.join(this.sessionsDir, file);
        try {
          const content = await readFile(fullPath);
          const { data } = matter(content);
          if (data.conversationId === conversationId) {
            sourcePath = fullPath;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!sourcePath || !(await fileExists(sourcePath))) {
        throw new Error('会话文件不存在 / Conversation file not found');
      }

      // 生成归档文件路径
      // Generate archived file path
      const targetPath = this.getArchivedFilePath(conversation);

      await renameFile(sourcePath, targetPath);

      logService.info('storage', `归档会话成功: ${conversationId} / Conversation archived successfully`);
    } catch (error) {
      logService.error('storage', `归档会话失败: ${conversationId} / Failed to archive conversation`, error);
      throw error;
    }
  }

  /**
   * 取消归档
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    await this.initialize();
    try {
      // 先从归档中加载会话以获取完整信息
      // Load conversation from archive first to get full info
      const conversation = await this.loadArchivedConversationById(conversationId);
      if (!conversation) {
        throw new Error('归档文件不存在 / Archived file not found');
      }

      // 查找归档文件
      // Find archived file
      const files = await listFiles(this.archivedDir, '.md');
      let sourcePath: string | null = null;

      for (const file of files) {
        const fullPath = path.join(this.archivedDir, file);
        try {
          const content = await readFile(fullPath);
          const { data } = matter(content);
          if (data.conversationId === conversationId) {
            sourcePath = fullPath;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!sourcePath || !(await fileExists(sourcePath))) {
        throw new Error('归档文件不存在 / Archived file not found');
      }

      // 生成目标文件路径
      // Generate target file path
      const targetPath = this.getConversationFilePath(conversation);

      await renameFile(sourcePath, targetPath);

      logService.info('storage', `取消归档成功: ${conversationId} / Conversation unarchived successfully`);
    } catch (error) {
      logService.error('storage', `取消归档失败: ${conversationId} / Failed to unarchive conversation`, error);
      throw error;
    }
  }

  /**
   * 列出归档会话
   */
  async listArchived(): Promise<Conversation[]> {
    await this.initialize();
    try {
      const files = await listFiles(this.archivedDir, '.md');
      const conversations: Conversation[] = [];

      for (const file of files) {
        const filePath = path.join(this.archivedDir, file);
        const content = await readFile(filePath);
        const { data, content: markdown } = matter(content);

        // 解析消息内容 / Parse message content
        const chats = this.parseChats(markdown);

        const conversation: Conversation = {
          conversationName: data.conversationName || '未命名会话',
          description: data.description || '',
          conversationId: data.conversationId || file.replace('.md', ''),
          createTime: data.createTime || data.createdAt || Date.now(),
          updateTime: data.updateTime || data.updatedAt || Date.now(),
          aiApplicationBindings: data.aiApplicationBindings || [],
          chats
        };

        conversations.push(conversation);
      }

      return conversations.sort((a, b) => b.updateTime - a.updateTime);
    } catch (error) {
      logService.error('storage', '列出归档会话失败', error);
      return [];
    }
  }

  /**
   * 根据ID加载归档会话
   * Load archived conversation by ID
   */
  private async loadArchivedConversationById(conversationId: string): Promise<Conversation | null> {
    try {
      const files = await listFiles(this.archivedDir, '.md');

      for (const file of files) {
        const filePath = path.join(this.archivedDir, file);
        try {
          const content = await readFile(filePath);
          const { data, content: markdown } = matter(content);

          if (data.conversationId === conversationId) {
            const chats = this.parseChats(markdown);

            const conversation: Conversation = {
              conversationName: data.conversationName || '未命名会话',
              description: data.description || '',
              conversationId: data.conversationId || conversationId,
              createTime: data.createTime || data.createdAt || Date.now(),
              updateTime: data.updateTime || data.updatedAt || Date.now(),
              aiApplicationBindings: data.aiApplicationBindings || [],
              chats
            };

            return conversation;
          }
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      logService.error('storage', `加载归档会话失败: ${conversationId}`, error);
      return null;
    }
  }

  /**
   * 删除归档会话
   */
  async deleteArchived(conversationId: string): Promise<void> {
    await this.initialize();
    try {
      // 查找匹配的归档文件
      // Find matching archived file
      const files = await listFiles(this.archivedDir, '.md');
      let filePath: string | null = null;

      for (const file of files) {
        const fullPath = path.join(this.archivedDir, file);
        try {
          const content = await readFile(fullPath);
          const { data } = matter(content);
          if (data.conversationId === conversationId) {
            filePath = fullPath;
            break;
          }
        } catch {
          continue;
        }
      }

      if (filePath && await fileExists(filePath)) {
        await deleteFile(filePath);
        logService.info('storage', `删除归档会话成功: ${conversationId} / Archived conversation deleted successfully`);
      }
    } catch (error) {
      logService.error('storage', `删除归档会话失败: ${conversationId} / Failed to delete archived conversation`, error);
      throw error;
    }
  }

  /**
   * 保存归档会话 / Save archived conversation
   * 用于更新归档会话的元数据 / Used to update archived conversation metadata
   */
  async saveArchivedConversation(conversation: Conversation): Promise<void> {
    await this.initialize();
    try {
      const markdown = conversationToMarkdown(conversation);
      const newFilePath = this.getArchivedFilePath(conversation);

      // 检查是否需要重命名文件
      // Check if file needs to be renamed
      const files = await listFiles(this.archivedDir, '.md');
      let oldFilePath: string | null = null;

      for (const file of files) {
        const filePath = path.join(this.archivedDir, file);
        try {
          const content = await readFile(filePath);
          const { data } = matter(content);
          if (data.conversationId === conversation.conversationId) {
            oldFilePath = filePath;
            break;
          }
        } catch {
          continue;
        }
      }

      // 如果找到旧文件且路径不同，进行重命名
      // If old file found and path differs, rename it
      if (oldFilePath && oldFilePath !== newFilePath) {
        await renameFile(oldFilePath, newFilePath);
        logService.info('storage', `重命名归档文件: ${path.basename(oldFilePath)} -> ${path.basename(newFilePath)} / Renamed archived file`);
      }

      await writeFile(newFilePath, markdown);

      logService.info('storage', `保存归档会话成功: ${conversation.conversationId} / Archived conversation saved successfully`);
    } catch (error) {
      logService.error('storage', `保存归档会话失败: ${conversation.conversationId} / Failed to save archived conversation`, error);
      throw error;
    }
  }

  /**
   * 解析 XML 格式的对话
   * Parse conversations from XML format
   */
  private parseChats(xmlContent: string): Chat[] {
    const chats: Chat[] = [];

    try {
      // 🔥 使用 fast-xml-parser 解析 XML
      // 🔥 Use fast-xml-parser to parse XML
      const { XMLParser } = require('fast-xml-parser');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        cdataPropName: '#cdata',
        // 🔥 安全配置：禁用实体处理，防止 XXE 攻击
        // 🔥 Security: Disable entity processing to prevent XXE attacks
        processEntities: false,
        allowBooleanAttributes: true,
        // 🔥 不允许 DOCTYPE 声明
        // 🔥 Disallow DOCTYPE declarations
        stopNodes: ['!DOCTYPE']
      });

      const parsed = parser.parse(xmlContent);

      // 检查是否有 conversation 节点
      if (!parsed.conversation) {
        logService.warn('storage', 'XML 中没有找到 conversation 节点 / No conversation node found in XML');
        return [];
      }

      // 获取 chats 数组（单个 chat 也会被处理为数组）
      const chatNodes = Array.isArray(parsed.conversation.chat)
        ? parsed.conversation.chat
        : [parsed.conversation.chat];

      logService.debug('storage', `解析到 ${chatNodes.length} 个 chat 节点 / Parsed ${chatNodes.length} chat nodes`);

      for (const chatNode of chatNodes) {
        if (!chatNode) continue;

        const chatId = chatNode['@_id'] || generateChatId();
        const chat: Chat = {
          chatId,
          messages: []
        };

        // 获取 messages 数组
        const messageNodes = Array.isArray(chatNode.message)
          ? chatNode.message
          : [chatNode.message];

        for (const msgNode of messageNodes) {
          if (!msgNode) continue;

          const role = msgNode['@_role'] || 'assistant';
          const sender = msgNode['@_sender'] || null;
          const messageId = msgNode['@_id'] || generateMessageId();
          const timestamp = parseInt(msgNode['@_timestamp']) || Date.now();

          // 获取内容（CDATA 或普通文本）
          // 🔥 【修复】优先使用#cdata或#text，如果都不是字符串则使用空字符串
          // 🔥 【Fixed】Prefer #cdata or #text, use empty string if neither is available
          let rawContent = '';
          if (msgNode.content) {
            if (typeof msgNode.content === 'string') {
              rawContent = msgNode.content;
            } else if (msgNode.content['#cdata'] !== undefined) {
              // 🔥 【关键】即使是空字符串也要使用，不要转换为对象
              // 🔥 【Key】Use even if empty string, don't convert to object
              rawContent = String(msgNode.content['#cdata']);
            } else if (msgNode.content['#text'] !== undefined) {
              rawContent = String(msgNode.content['#text']);
            }
            // 🔥 【移除】如果都不是，保持空字符串，不要将对象转为 [object Object]
            // 🔥 【Removed】If neither, keep empty string, don't convert object to [object Object]
          }

          // 🔥 【安全】确保content始终是字符串类型
          const content = typeof rawContent === 'string' ? rawContent : '';

          // 🔥 【新增】读取 status 和 error 字段
          // 🔥 【New】Read status and error fields
          const status = msgNode['@_status'] as MessageStatus | undefined;
          const error = msgNode['@_error'] as string | undefined;

          const message: Message = {
            messageId,
            role,
            sender,
            timestamp,
            content,
            ...(status !== undefined && { status }),  // 只在存在时添加 / Only add if exists
            ...(error !== undefined && { error })     // 只在存在时添加 / Only add if exists
          };

          chat.messages.push(message);
        }

        chats.push(chat);
      }

      logService.info('storage', `解析完成，共有 ${chats.length} 个 Chats / Parsed ${chats.length} chats`);
      return chats;
    } catch (error) {
      logService.error('storage', '解析 XML 失败 / Failed to parse XML', error);
      // 返回空数组而不是抛出异常，避免整个会话加载失败
      // Return empty array instead of throwing error to avoid entire conversation loading failure
      return [];
    }
  }

  /**
   * 添加消息到聊天
   */
  private addMessageToChat(
    chat: Chat,
    role: string,
    sender: string | null,
    content: string
  ): void {
    const message: Message = {
      messageId: generateMessageId(),
      role: role as any,
      sender,
      timestamp: Date.now(),
      content: content.trim()
    };
    chat.messages.push(message);
  }
}

// 导出单例
export const storageService = new StorageService();
