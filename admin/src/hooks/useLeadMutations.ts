import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../api/leads';
import type { Lead, LeadWithNotes, Note } from '../types/lead';

export function useUpdateLead(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Lead>) => leadsApi.update(leadId, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      const previousLead = queryClient.getQueryData<LeadWithNotes>(['lead', leadId]);

      if (previousLead) {
        queryClient.setQueryData<LeadWithNotes>(['lead', leadId], {
          ...previousLead,
          ...data,
        });
      }

      return { previousLead };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', leadId], context.previousLead);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] }); // Refresh list too
    },
  });
}

export function useAddNote(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => leadsApi.addNote(leadId, content),
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] });
      const previousLead = queryClient.getQueryData<LeadWithNotes>(['lead', leadId]);

      if (previousLead) {
        const optimisticNote: Note = {
          id: 'temp-' + Date.now(),
          leadId,
          content,
          authorId: 'current-user', // Will be replaced by server
          authorName: 'You',
          type: 'MANUAL',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        queryClient.setQueryData<LeadWithNotes>(['lead', leadId], {
          ...previousLead,
          notes: [optimisticNote, ...previousLead.notes],
        });
      }

      return { previousLead };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousLead) {
        queryClient.setQueryData(['lead', leadId], context.previousLead);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}

export function useUpdateNote(leadId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      leadsApi.updateNote(leadId, noteId, content),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
    },
  });
}
