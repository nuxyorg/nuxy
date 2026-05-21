import React, { useRef, useEffect } from 'react'
import './index.css'

let scrollAnimationId: number | null = null;
let currentTargetTop: number | null = null;
let currentContainer: HTMLElement | null = null;

function smoothScrollTo(container: HTMLElement, target: number) {
  currentTargetTop = target;
  currentContainer = container;

  if (scrollAnimationId === null) {
    const animate = () => {
      if (!currentContainer || currentTargetTop === null) {
        scrollAnimationId = null;
        return;
      }
      
      const diff = currentTargetTop - currentContainer.scrollTop;
      if (Math.abs(diff) < 1) {
        currentContainer.scrollTop = currentTargetTop;
        scrollAnimationId = null;
        return;
      }

      currentContainer.scrollTop += diff * 0.3;
      scrollAnimationId = requestAnimationFrame(animate);
    };
    
    scrollAnimationId = requestAnimationFrame(animate);
  }
}

function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (!node || node === document.body) return null;
  const style = window.getComputedStyle(node);
  if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
    return node;
  }
  return getScrollParent(node.parentElement);
}

function smoothScrollIntoViewIfNeeded(el: HTMLElement) {
  const parent = getScrollParent(el.parentElement);
  
  if (!parent) {
    el.scrollIntoView({ block: 'nearest' });
    return;
  }

  const elRect = el.getBoundingClientRect();
  const parentRect = parent.getBoundingClientRect();

  let targetScrollTop = currentContainer === parent && scrollAnimationId !== null && currentTargetTop !== null
    ? currentTargetTop
    : parent.scrollTop;

  const futureElTop = elRect.top + (parent.scrollTop - targetScrollTop);
  const futureElBottom = futureElTop + elRect.height;

  if (futureElBottom > parentRect.bottom) {
    targetScrollTop += (futureElBottom - parentRect.bottom);
  } else if (futureElTop < parentRect.top) {
    targetScrollTop -= (parentRect.top - futureElTop);
  }

  targetScrollTop = Math.max(0, Math.min(targetScrollTop, parent.scrollHeight - parent.clientHeight));

  if (targetScrollTop !== parent.scrollTop || scrollAnimationId !== null) {
    smoothScrollTo(parent, targetScrollTop);
  }
}

export interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  className?: string
}

export function ListItem({
  children,
  active,
  className,
  onClick,
  onKeyDown,
  ...props
}: ListItemProps) {
  const interactive = Boolean(onClick)
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (active && itemRef.current) {
      smoothScrollIntoViewIfNeeded(itemRef.current)
    }
  }, [active])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (interactive && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
    }
    onKeyDown?.(e)
  }

  return (
    <div
      ref={itemRef}
      className={`nuxy-list-item ${active ? 'nuxy-list-item--active' : ''} ${className || ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}
