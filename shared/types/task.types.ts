/**
 * 任务类型定义 / Task type definitions
 * 用于区分正常会话任务和内部任务（如标题生成、总结等）
 * Used to distinguish between normal conversation tasks and internal tasks (title generation, summary, etc.)
 */

/**
 * 任务分类枚举 / Task classification enum
 * - CONVERSATION: 正常会话任务 / Normal conversation task
 * - INTERNAL: 内部任务（标题生成、总结等）/ Internal task (title generation, summary, etc.)
 */
export enum TaskClass {
  CONVERSATION = 'conversation',
  INTERNAL = 'internal'
}

/**
 * 内部任务类型枚举 / Internal task type enum
 * - TITLE_GENERATION: 自动生成会话标题 / Auto-generate conversation title
 * - SUMMARY_GENERATION: 生成对话总结 / Generate conversation summary
 */
export enum InternalTaskType {
  TITLE_GENERATION = 'title_generation',
  SUMMARY_GENERATION = 'summary_generation'
}
