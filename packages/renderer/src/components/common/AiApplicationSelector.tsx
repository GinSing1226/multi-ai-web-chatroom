/**
 * AI 应用选择组件
 * AI application selector component
 */
import { useState } from 'react';
import { AiApplication, cn } from '@shared';

export interface AiApplicationSelectorProps {
  applications: AiApplication[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelect?: number;
  className?: string;
}

export function AiApplicationSelector({
  applications,
  selected,
  onChange,
  maxSelect,
  className,
}: AiApplicationSelectorProps) {
  const toggleSelection = (appId: string) => {
    const isSelected = selected.includes(appId);

    if (isSelected) {
      // 取消选择 / Deselect
      onChange(selected.filter(id => id !== appId));
    } else {
      // 检查最大选择数量 / Check max selection count
      if (maxSelect && selected.length >= maxSelect) {
        return; // 达到上限 / Reached limit
      }
      // 添加选择 / Add selection
      onChange([...selected, appId]);
    }
  };

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {applications.map(app => {
        const isSelected = selected.includes(app.id);
        const isDisabled = !isSelected && maxSelect && selected.length >= maxSelect;

        return (
          <button
            key={app.id}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(app.id);
            }}
            disabled={isDisabled}
            className={cn(
              'relative flex items-center gap-2 px-4 py-2.5 rounded-xl border-2',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'border-border-secondary bg-bg-secondary hover:border-blue-300 dark:hover:border-blue-700 text-text-secondary',
              'hover:shadow-md'
            )}
            title={app.description}
          >
            {/* Logo */}
            <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
              {app.logoType === 'emoji' ? (
                <span className="text-xl">{app.logoContent}</span>
              ) : (
                <img
                  src={app.logoContent}
                  alt={app.name}
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    // 图片加载失败时显示首字母 / Show first letter on image load failure
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent && !parent.querySelector('.fallback-text')) {
                      const fallback = document.createElement('span');
                      fallback.className = 'fallback-text text-xs font-bold text-text-secondary';
                      fallback.textContent = app.shortName || app.name.charAt(0);
                      parent.appendChild(fallback);
                    }
                  }}
                />
              )}
            </div>

            {/* 名称 / Name */}
            <span className="font-medium text-sm">{app.name}</span>

            {/* 右上角选中标记 / Selection indicator at top-right */}
            {isSelected && (
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}

      {/* 提示信息 / Hint */}
      {maxSelect && selected.length >= maxSelect && (
        <p className="w-full text-xs text-text-tertiary">
          最多选择 {maxSelect} 个 AI 应用 / Maximum {maxSelect} AI applications
        </p>
      )}
    </div>
  );
}

/**
 * 紧凑型 AI 应用选择器(用于已选应用展示)
 * Compact AI application selector (for displaying selected applications)
 */
export interface AiApplicationBadgeProps {
  application: AiApplication;
  onRemove?: () => void;
  className?: string;
}

export function AiApplicationBadge({
  application,
  onRemove,
  className,
}: AiApplicationBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border-secondary bg-bg-secondary text-text-secondary text-sm',
        className
      )}
    >
      {/* Logo */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {application.logoType === 'emoji' ? (
          <span className="text-sm">{application.logoContent}</span>
        ) : (
          <img
            src={application.logoContent}
            alt={application.name}
            className="w-4 h-4 object-contain"
            onError={(e) => {
              // 图片加载失败时显示首字母 / Show first letter on image load failure
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.fallback-text')) {
                const fallback = document.createElement('span');
                fallback.className = 'fallback-text text-xs font-bold text-text-secondary';
                fallback.textContent = application.shortName || application.name.charAt(0);
                parent.appendChild(fallback);
              }
            }}
          />
        )}
      </div>

      {/* 名称 / Name */}
      <span className="font-medium">{application.name}</span>

      {/* 移除按钮 / Remove button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded hover:bg-bg-tertiary transition-colors"
          title={`移除 ${application.name} / Remove ${application.name}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
