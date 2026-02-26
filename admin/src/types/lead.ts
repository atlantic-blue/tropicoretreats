export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST' | 'ARCHIVED';
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
  /** Previous status before archiving (used for restore) */
  previousStatus?: string;
  unreadEmailCount?: number;
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

// Email CRM types

export interface Email {
  id: string;
  leadId: string;
  direction: 'inbound' | 'outbound';
  fromAddress: string;
  toAddress: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  sentAt: string;
  readAt: string | null;
  operator: string | null;
  createdAt: string;
}

export interface EmailAttachment {
  filename: string;
  s3Key: string;
  contentType: string;
  size: number;
}

export interface EmailsResponse {
  emails: Email[];
  nextCursor?: string;
  totalCount: number;
}

export interface SendEmailPayload {
  leadId: string;
  to: string;
  subject: string;
  bodyText: string;
}

export interface MarkReadResponse {
  markedCount: number;
  leadId: string;
}
