/**
 * 默认提示词常量
 * Default prompt constants
 */

import type { Language } from '@shared/types/i18n.types';

/**
 * 获取总结输出的默认提示词
 * Get default summary output prompt
 *
 * @param lang - 语言 / Language
 * @returns 默认提示词 / Default prompt
 */
export function getDefaultSummaryPrompt(lang: Language = 'zh'): string {
  const prompts = {
    zh: `深入阅读理解以下内容，总结综合各方内容并输出。你只能输出总结内容，禁止输出其它内容。`,
    en: `Read and understand the following content thoroughly, then summarize and synthesize the key points from all sources. You must only output the summary content, nothing else.`
  };
  return prompts[lang];
}

/**
 * 获取自动生成会话元数据的默认提示词
 * Get default prompt for auto-generating session metadata
 *
 * @param lang - 语言 / Language
 * @returns 默认提示词 / Default prompt
 */
export function getDefaultTitlePrompt(lang: Language = 'zh'): string {
  const prompts = {
    zh: `深入阅读理解以下内容，总结提炼出30字以内的标题、200字以内的描述。输出以下的JSON结构体：{"conversationName":"","description":""}。你只能输出以上JSON结构，禁止输出其它内容。`,
    en: `Read and understand the following content thoroughly, then extract a title within 30 words and a description within 200 words. Output the following JSON structure: {"conversationName":"","description":""}. You must only output this JSON structure, nothing else.`
  };
  return prompts[lang];
}

/**
 * 总结输出的默认提示词（已废弃，请使用 getDefaultSummaryPrompt）
 * Default summary output prompt (deprecated, use getDefaultSummaryPrompt)
 * @deprecated
 */
export const DEFAULT_SUMMARY_PROMPT = getDefaultSummaryPrompt('zh');

/**
 * 自动生成会话元数据的默认提示词（已废弃，请使用 getDefaultTitlePrompt）
 * Default prompt for auto-generating session metadata (deprecated, use getDefaultTitlePrompt)
 * @deprecated
 */
export const DEFAULT_TITLE_PROMPT = getDefaultTitlePrompt('zh');
