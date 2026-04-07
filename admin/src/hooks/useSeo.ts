import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { seoApi } from '../api/seo';
import type { UpsertSeoPayload } from '../api/seo';

export function useSeoSettings() {
  return useQuery({
    queryKey: ['seoSettings'],
    queryFn: () => seoApi.list(),
  });
}

export function useUpsertSeoSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ path, payload }: { path: string; payload: UpsertSeoPayload }) =>
      seoApi.upsert(path, payload),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['seoSettings'] });
    },
  });
}
