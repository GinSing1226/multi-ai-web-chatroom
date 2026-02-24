/**
 * clsx + twMerge 工具函数
 * 用于合并 TailwindCSS 类名
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
