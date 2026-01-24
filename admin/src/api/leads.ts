import { fetchWithAuth } from './client';
import type { Lead, LeadWithNotes, LeadsResponse, Note, User } from '../types/lead';

export interface FilterParams {
  status?: string[];
  temperature?: string[];
  assignee?: string;
  search?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export const leadsApi = {
  list: (params: FilterParams): Promise<LeadsResponse> => {
    const searchParams = new URLSearchParams();
    if (params.status?.length) {
      params.status.forEach(s => searchParams.append('status', s));
    }
    if (params.temperature?.length) {
      params.temperature.forEach(t => searchParams.append('temperature', t));
    }
    if (params.assignee) searchParams.set('assignee', params.assignee);
    if (params.search) searchParams.set('search', params.search);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);
    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.limit) searchParams.set('limit', String(params.limit));
    return fetchWithAuth<LeadsResponse>(`/leads?${searchParams.toString()}`);
  },

  get: (id: string): Promise<LeadWithNotes> =>
    fetchWithAuth<LeadWithNotes>(`/leads/${id}`),

  update: (id: string, data: Partial<Lead>): Promise<Lead> =>
    fetchWithAuth<Lead>(`/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  addNote: (leadId: string, content: string): Promise<Note> =>
    fetchWithAuth<Note>(`/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),

  updateNote: (leadId: string, noteId: string, content: string): Promise<Note> =>
    fetchWithAuth<Note>(`/leads/${leadId}/notes/${noteId}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
};

export const usersApi = {
  list: (): Promise<{ users: User[] }> =>
    fetchWithAuth<{ users: User[] }>('/users'),
};
