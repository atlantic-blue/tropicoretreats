import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router';

export interface Filters {
  search: string;
  status: string[];
  temperature: string[];
  assignee: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  showArchived: boolean;
}

export interface CursorState {
  /** Cursors indexed by page number (page 2's cursor is at index 1) */
  cursors: (string | undefined)[];
  /** Current page number (1-indexed) */
  currentPage: number;
}

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Track cursors for each page (page 1 has no cursor, page 2 uses cursor from page 1's response, etc.)
  const [cursorState, setCursorState] = useState<CursorState>({
    cursors: [undefined], // Page 1 has no cursor
    currentPage: 1,
  });

  const filters: Filters = {
    search: searchParams.get('search') || '',
    status: searchParams.getAll('status'),
    temperature: searchParams.getAll('temp'),
    assignee: searchParams.get('assignee') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    page: cursorState.currentPage,
    showArchived: searchParams.get('showArchived') === 'true',
  };

  // Get cursor for current page
  const getCurrentCursor = useCallback((): string | undefined => {
    const pageIndex = cursorState.currentPage - 1;
    return cursorState.cursors[pageIndex];
  }, [cursorState]);

  // Store cursor for next page (called when API returns nextCursor)
  const setNextCursor = useCallback((nextCursor: string | undefined) => {
    setCursorState(prev => {
      const newCursors = [...prev.cursors];
      // Store cursor for the next page at current page index
      newCursors[prev.currentPage] = nextCursor;
      return { ...prev, cursors: newCursors };
    });
  }, []);

  const setFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    if (Array.isArray(value)) {
      value.forEach(v => newParams.append(key, v));
    } else if (value) {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
    // Reset pagination when filter changes
    setCursorState({ cursors: [undefined], currentPage: 1 });
  };

  // Set multiple filters at once to avoid race conditions (e.g., date range from/to)
  const setFilters = (updates: Record<string, string | string[]>) => {
    const newParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      newParams.delete(key);
      if (Array.isArray(value)) {
        value.forEach(v => newParams.append(key, v));
      } else if (value) {
        newParams.set(key, value);
      }
    }
    setSearchParams(newParams);
    // Reset pagination when filter changes
    setCursorState({ cursors: [undefined], currentPage: 1 });
  };

  const setPage = useCallback((page: number) => {
    setCursorState(prev => {
      // Only allow navigating to pages we have cursors for
      if (page < 1) return prev;
      if (page > prev.cursors.length) return prev; // Can't jump ahead
      return { ...prev, currentPage: page };
    });
  }, []);

  const goToNextPage = useCallback(() => {
    setCursorState(prev => {
      // Can only go to next page if we have a cursor for it
      if (prev.cursors[prev.currentPage] === undefined && prev.currentPage > 1) {
        return prev; // No more pages
      }
      return { ...prev, currentPage: prev.currentPage + 1 };
    });
  }, []);

  const goToPrevPage = useCallback(() => {
    setCursorState(prev => ({
      ...prev,
      currentPage: Math.max(1, prev.currentPage - 1),
    }));
  }, []);

  const clearFilters = () => {
    setSearchParams({});
    setCursorState({ cursors: [undefined], currentPage: 1 });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status.length ||
    filters.temperature.length ||
    filters.assignee ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.showArchived
  );

  // Check if we can navigate to next page
  const hasNextPage = cursorState.cursors[cursorState.currentPage] !== undefined;
  const hasPrevPage = cursorState.currentPage > 1;

  return {
    filters,
    setFilter,
    setFilters,
    setPage,
    goToNextPage,
    goToPrevPage,
    clearFilters,
    hasActiveFilters,
    getCurrentCursor,
    setNextCursor,
    hasNextPage,
    hasPrevPage,
  };
}
