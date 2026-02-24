/**
 * DropdownMenu 下拉菜单组件
 * Dropdown menu component
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@shared';

/**
 * 菜单项接口 / Menu item interface
 */
export interface MenuItem {
  /** 唯一标识 / Unique key */
  key: string;
  /** 显示文本 / Display label */
  label: string;
  /** 图标（可选） / Icon (optional) */
  icon?: React.ReactNode;
  /** 点击回调 / Click callback */
  onClick: () => void;
  /** 样式变体 / Style variant */
  variant?: 'default' | 'danger' | 'warning';
}

/**
 * 下拉菜单组件属性 / Dropdown menu component props
 */
export interface DropdownMenuProps {
  /** 触发元素 / Trigger element */
  trigger: React.ReactNode;
  /** 菜单项列表 / Menu items list */
  items: MenuItem[];
  /** 对齐方式 / Alignment */
  align?: 'left' | 'right';
  /** 🔥 触发方式：click（点击）、hover（悬停）、both（两者都支持） / Trigger mode */
  triggerMode?: 'click' | 'hover' | 'both';
}

export function DropdownMenu({ trigger, items, align = 'right', triggerMode = 'click' }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 计算菜单位置 / Calculate menu position
   */
  const calculatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const menuWidth = 160; // 估计菜单宽度 / Estimated menu width

      if (align === 'right') {
        setPosition({
          top: rect.bottom + 4,
          left: rect.right - menuWidth,
        });
      } else {
        setPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
    }
  };

  /**
   * 显示菜单 / Show menu
   */
  const showMenu = () => {
    calculatePosition();
    setIsOpen(true);
  };

  /**
   * 隐藏菜单 / Hide menu
   */
  const hideMenu = () => {
    setIsOpen(false);
  };

  /**
   * 处理触发器点击 / Handle trigger click
   * 计算菜单位置并切换显示状态 / Calculate menu position and toggle visibility
   */
  const handleClickTrigger = (event: React.MouseEvent) => {
    event.stopPropagation();

    // 🔥 如果是 hover 或 both 模式，点击时不做处理（由 hover 处理）
    // 🔥 If hover or both mode, let hover handle it
    if (triggerMode === 'hover' || triggerMode === 'both') {
      return;
    }

    // click 模式：切换显示状态 / click mode: toggle visibility
    if (isOpen) {
      hideMenu();
    } else {
      showMenu();
    }
  };

  /**
   * 🔥 处理鼠标进入触发器 / Handle mouse enter trigger
   */
  const handleMouseEnter = () => {
    // 清除之前的延迟关闭定时器 / Clear previous delayed close timer
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // 🔥 只在 hover 或 both 模式下响应 / Only respond in hover or both mode
    if (triggerMode === 'hover' || triggerMode === 'both') {
      showMenu();
    }
  };

  /**
   * 🔥 处理鼠标离开触发器或菜单 / Handle mouse leave trigger or menu
   */
  const handleMouseLeave = () => {
    // 🔥 只在 hover 或 both 模式下响应 / Only respond in hover or both mode
    if (triggerMode === 'hover' || triggerMode === 'both') {
      // 延迟关闭，避免用户误操作 / Delay close to avoid accidental user actions
      hoverTimeoutRef.current = setTimeout(() => {
        hideMenu();
      }, 200);
    }
  };

  /**
   * 🔥 处理鼠标进入菜单 / Handle mouse enter menu
   */
  const handleMouseEnterMenu = () => {
    // 清除延迟关闭定时器，保持菜单打开 / Clear delayed close timer, keep menu open
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  /**
   * 点击外部关闭菜单 / Close menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * 🔥 清理定时器 / Cleanup timer
   */
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  /**
   * 处理菜单项点击 / Handle menu item click
   */
  const handleItemClick = (item: MenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  /**
   * 获取菜单项样式 / Get menu item style
   */
  const getItemStyle = (variant: MenuItem['variant']) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20';
      default:
        return 'text-text-primary hover:bg-bg-secondary';
    }
  };

  return (
    <div className="relative">
      {/* 触发器 / Trigger */}
      <div
        ref={triggerRef}
        onClick={handleClickTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {/* 下拉菜单（使用 Portal 渲染到 body 避免被裁剪） / Dropdown menu (rendered to body via Portal to avoid clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            onMouseEnter={handleMouseEnterMenu}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[9999] min-w-[160px] py-1 bg-bg-primary rounded-lg shadow-lg border border-border-secondary"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                  getItemStyle(item.variant)
                )}
              >
                {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
