import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsApi } from '../api/leads';

export function useEmails(leadId: string) {
  return useQuery({
    queryKey: ['emails', leadId],
    queryFn: () => emailsApi.list(leadId),
    enabled: !!leadId,
    staleTime: 1000 * 30, // 30 seconds — emails change frequently
  });
}

export function useSendEmail(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: emailsApi.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', leadId] });
    },
  });
}

export function useMarkRead(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => emailsApi.markRead(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}
