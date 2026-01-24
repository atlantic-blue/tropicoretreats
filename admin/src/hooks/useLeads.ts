import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { leadsApi, usersApi, type FilterParams } from '../api/leads';
import { useDebouncedValue } from './useDebouncedValue';
import type { Filters } from './useFilters';

export function useLeads(filters: Filters) {
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const params: FilterParams = {
    search: debouncedSearch || undefined,
    status: filters.status.length ? filters.status : undefined,
    temperature: filters.temperature.length ? filters.temperature : undefined,
    assignee: filters.assignee || undefined,
    from: filters.dateFrom || undefined,
    to: filters.dateTo || undefined,
    limit: 15,
  };

  return useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.users),
    staleTime: 1000 * 60 * 30, // 30 minutes - users don't change often
  });
}
