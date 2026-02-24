/**
 * Loading 加载组件
 */
import { cn } from '@shared';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'current';
  className?: string;
}

export function Loading({ size = 'md', color = 'primary', className }: LoadingProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const colorStyles = {
    primary: 'border-blue-200 dark:border-blue-800 border-t-blue-600 dark:border-t-blue-400',
    secondary: 'border-gray-200 dark:border-gray-800 border-t-gray-600 dark:border-t-gray-400',
    current: 'border-gray-200 dark:border-gray-800 border-t-current',
  };

  return (
    <div
      className={cn(
        'rounded-full animate-spin',
        sizeStyles[size],
        colorStyles[color],
        className
      )}
    />
  );
}

/**
 * 全屏加载遮罩
 */
export interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = '加载中...', className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/80 dark:bg-bg-primary/90 backdrop-blur-sm',
        className
      )}
    >
      <Loading size="lg" />
      {message && (
        <p className="mt-4 text-sm text-text-secondary">{message}</p>
      )}
    </div>
  );
}

/**
 * 内联加载指示器
 */
export interface InlineLoadingProps {
  message?: string;
  className?: string;
}

export function InlineLoading({ message, className }: InlineLoadingProps) {
  return (
    <div className={cn('flex items-center gap-3 text-text-secondary', className)}>
      <Loading size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}
