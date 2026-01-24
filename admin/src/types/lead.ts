export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';
export type Temperature = 'HOT' | 'WARM' | 'COLD';
export type NoteType = 'MANUAL' | 'SYSTEM';

export interface Lead {
  id: string;
  status: LeadStatus;
  temperature: Temperature;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  groupSize?: string;
  preferredDates?: string;
  destination?: string;
  message: string;
  assigneeId?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  leadId: string;
  content: string;
  authorId: string;
  authorName: string;
  type: NoteType;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithNotes extends Lead {
  notes: Note[];
}

export interface LeadsResponse {
  leads: Lead[];
  nextCursor?: string;
  totalCount: number;
}

export interface User {
  id: string;
  email: string;
  username: string;
}
