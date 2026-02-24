/**
 * Markdown 渲染组件
 * 使用 @ant-design/x-markdown - 专为 AI 应用设计的流式友好 Markdown 渲染器
 * Markdown Renderer Component
 * Using @ant-design/x-markdown - Streaming-friendly Markdown renderer designed for AI applications
 */
import React from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import { cn } from '@shared';

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Markdown 渲染器组件
 * Markdown Renderer Component
 *
 * 特性 / Features:
 * - 🚀 高性能 / High performance (基于 marked)
 * - 🤖 流式友好 / Streaming friendly
 * - 🔐 安全 / Secure (无 XSS)
 * - 🎨 可自定义 / Customizable
 * - 🔧 丰富插件 / Rich plugins (LaTeX, Mermaid, etc.)
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('x-markdown-wrapper', className)}>
      <XMarkdown
        content={content}
        // 可选：配置插件 / Optional: Configure plugins
        plugins={[]}
        // 可选：配置主题 / Optional: Configure theme
        // theme="light"
        components={{
          // 自定义标题样式 / Custom heading styles
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-text-primary mb-4 mt-6">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-text-primary mb-3 mt-5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-text-primary mb-2 mt-4">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold text-text-primary mb-2 mt-3">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-sm font-semibold text-text-primary mb-2 mt-2">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-xs font-semibold text-text-secondary mb-2 mt-2">
              {children}
            </h6>
          ),
          // 自定义段落样式 / Custom paragraph styles
          p: ({ children }) => (
            <p className="leading-relaxed mb-4">
              {children}
            </p>
          ),
          // 自定义列表样式 / Custom list styles
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li>
              {children}
            </li>
          ),
          // 自定义表格样式 / Custom table styles with borders
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-border-secondary">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-bg-secondary">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody>
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border-secondary hover:bg-bg-secondary/50">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-semibold border-r border-border-secondary last:border-r-0">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm border-r border-border-secondary last:border-r-0">
              {children}
            </td>
          ),
        }}
      />
    </div>
  );
}
