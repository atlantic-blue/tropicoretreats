import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useEffect } from 'react';
import { leadsApi, usersApi, type FilterParams } from '../api/leads';
import { useDebouncedValue } from './useDebouncedValue';
import type { Filters } from './useFilters';

interface UseLeadsOptions {
  filters: Filters;
  cursor?: string;
  onNextCursor?: (cursor: string | undefined) => void;
}

// All active statuses (non-archived)
const ACTIVE_STATUSES = ['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST'];

export function useLeads({ filters, cursor, onNextCursor }: UseLeadsOptions) {
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  // When showArchived is false, exclude ARCHIVED from results
  // If specific statuses are selected, filter those; otherwise use all active statuses
  let statusFilter: string[] | undefined;
  if (filters.showArchived) {
    // Show all including archived - use whatever is selected or undefined for all
    statusFilter = filters.status.length ? filters.status : undefined;
  } else {
    // Hide archived - filter to only active statuses
    if (filters.status.length) {
      // User selected specific statuses, exclude ARCHIVED from selection
      statusFilter = filters.status.filter(s => s !== 'ARCHIVED');
      if (statusFilter.length === 0) {
        statusFilter = ACTIVE_STATUSES;
      }
    } else {
      // No status filter, show all active
      statusFilter = ACTIVE_STATUSES;
    }
  }

  const params: FilterParams = {
    search: debouncedSearch || undefined,
    status: statusFilter,
    temperature: filters.temperature.length ? filters.temperature : undefined,
    assignee: filters.assignee || undefined,
    from: filters.dateFrom || undefined,
    to: filters.dateTo || undefined,
    cursor,
    limit: 15,
  };

  const query = useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.list(params),
    placeholderData: keepPreviousData,
  });

  // Store the cursor for next page when data loads
  useEffect(() => {
    if (query.data?.nextCursor !== undefined && onNextCursor) {
      onNextCursor(query.data.nextCursor);
    }
  }, [query.data?.nextCursor, onNextCursor]);

  return query;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.users),
    staleTime: 1000 * 60 * 30, // 30 minutes - users don't change often
  });
}
