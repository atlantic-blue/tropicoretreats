import { useSearchParams } from 'react-router';

export interface Filters {
  search: string;
  status: string[];
  temperature: string[];
  assignee: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}

export function useFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: Filters = {
    search: searchParams.get('search') || '',
    status: searchParams.getAll('status'),
    temperature: searchParams.getAll('temp'),
    assignee: searchParams.get('assignee') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
  };

  const setFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    if (Array.isArray(value)) {
      value.forEach(v => newParams.append(key, v));
    } else if (value) {
      newParams.set(key, value);
    }
    // Reset to page 1 when filter changes (except page itself)
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  };

  const setPage = (page: number) => setFilter('page', String(page));

  const clearFilters = () => setSearchParams({});

  const hasActiveFilters = Boolean(
    filters.search ||
    filters.status.length ||
    filters.temperature.length ||
    filters.assignee ||
    filters.dateFrom ||
    filters.dateTo
  );

  return { filters, setFilter, setPage, clearFilters, hasActiveFilters };
}
