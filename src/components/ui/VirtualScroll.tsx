import React, { useState, useMemo, useCallback, useRef } from 'react';

export interface VirtualScrollItem {
  id: string | number;
  height?: number;
}

interface VirtualScrollProps<T extends VirtualScrollItem> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  estimatedItemHeight?: number;
}

export function VirtualScroll<T extends VirtualScrollItem>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 3,
  onScroll,
  estimatedItemHeight
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const actualItemHeight = estimatedItemHeight || itemHeight;

  // Calculate which items should be visible
  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / actualItemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / actualItemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, actualItemHeight, containerHeight, items.length, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  // Calculate total height and offset
  const totalHeight = items.length * actualItemHeight;
  const offsetY = visibleRange.start * actualItemHeight;

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              style={{
                height: item.height || actualItemHeight,
                minHeight: item.height || actualItemHeight,
              }}
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for virtual scroll functionality
export function useVirtualScroll<T extends VirtualScrollItem>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange.start, visibleRange.end]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    scrollTop,
    setScrollTop,
  };
}

// Grid virtual scroll component for 2D virtualization
interface VirtualGridProps<T extends VirtualScrollItem> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  gap?: number;
}

export function VirtualGrid<T extends VirtualScrollItem>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  className = '',
  gap = 0
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const itemsPerRow = Math.floor(containerWidth / (itemWidth + gap));
  const totalRows = Math.ceil(items.length / itemsPerRow);

  const visibleRowRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / itemHeight);
    const endRow = Math.min(
      startRow + Math.ceil(containerHeight / itemHeight),
      totalRows - 1
    );

    return { start: Math.max(0, startRow), end: endRow };
  }, [scrollTop, itemHeight, containerHeight, totalRows]);

  const visibleItems = useMemo(() => {
    const startIndex = visibleRowRange.start * itemsPerRow;
    const endIndex = Math.min((visibleRowRange.end + 1) * itemsPerRow, items.length);
    return items.slice(startIndex, endIndex);
  }, [items, visibleRowRange, itemsPerRow]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ width: containerWidth, height: containerHeight }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalRows * itemHeight,
          width: itemsPerRow * (itemWidth + gap) - gap,
          position: 'relative',
        }}
      >
        <div
          style={{
            transform: `translateY(${visibleRowRange.start * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const rowIndex = Math.floor(index / itemsPerRow);
            const colIndex = index % itemsPerRow;
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  width: itemWidth,
                  height: itemHeight,
                  left: colIndex * (itemWidth + gap),
                  top: rowIndex * itemHeight,
                }}
              >
                {renderItem(item, visibleRowRange.start * itemsPerRow + index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 