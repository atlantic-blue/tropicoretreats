import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../api/leads';

export function useLeadDetail(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.get(id),
    enabled: !!id,
  });
}
