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

export function useLeads({ filters, cursor, onNextCursor }: UseLeadsOptions) {
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const params: FilterParams = {
    search: debouncedSearch || undefined,
    status: filters.status.length ? filters.status : undefined,
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
