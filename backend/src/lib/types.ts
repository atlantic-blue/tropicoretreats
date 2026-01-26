/** Lead temperature indicating sales priority */
export type Temperature = 'HOT' | 'WARM' | 'COLD';

/** Temperature enum for type-safe temperature handling */
export const TemperatureEnum = {
  HOT: 'HOT',
  WARM: 'WARM',
  COLD: 'COLD',
} as const;

export type TemperatureType = (typeof TemperatureEnum)[keyof typeof TemperatureEnum];

/**
 * Lead entity type with DynamoDB keys and GSI attributes.
 *
 * Table design:
 * - PK/SK: LEAD#{id} for single-item access
 * - GSI1PK/GSI1SK: STATUS#{status}/createdAt for status-based queries
 */
export interface Lead {
  /** Primary key: LEAD#{id} */
  PK: string;
  /** Sort key: LEAD#{id} */
  SK: string;
  /** GSI1 hash key: STATUS#{status} for querying by status */
  GSI1PK: string;
  /** GSI1 sort key: ISO 8601 createdAt for chronological sorting */
  GSI1SK: string;
  /** ULID - sortable unique identifier */
  id: string;
  /** Lead status in sales pipeline */
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST' | 'ARCHIVED';
  /** Previous status before archiving (used for restore) */
  previousStatus?: string;
  /** Lead temperature indicating sales priority (default WARM for new leads) */
  temperature: Temperature;
  /** Contact first name */
  firstName: string;
  /** Contact last name */
  lastName: string;
  /** Contact email address */
  email: string;
  /** Contact phone number (optional) */
  phone?: string;
  /** Company name (optional) */
  company?: string;
  /** Retreat group size (optional) */
  groupSize?: string;
  /** Preferred retreat dates (optional) */
  preferredDates?: string;
  /** Preferred destination (optional) */
  destination?: string;
  /** Enquiry message */
  message: string;
  /** Cognito user sub of assigned team member (optional) */
  assigneeId?: string;
  /** Denormalized display name of assignee (optional) */
  assigneeName?: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/** Lead status enum for type-safe status handling */
export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUOTED: 'QUOTED',
  WON: 'WON',
  LOST: 'LOST',
  ARCHIVED: 'ARCHIVED',
} as const;

export type LeadStatusType = (typeof LeadStatus)[keyof typeof LeadStatus];

/** Note type enum for distinguishing manual notes from system-generated */
export const NoteType = {
  MANUAL: 'MANUAL',
  SYSTEM: 'SYSTEM',
} as const;

export type NoteTypeValue = (typeof NoteType)[keyof typeof NoteType];

/**
 * Note entity type for lead notes/comments.
 *
 * Table design:
 * - PK: LEAD#{leadId} (co-located with lead for efficient queries)
 * - SK: NOTE#{timestamp}#{noteId} (chronological ordering, unique within lead)
 */
export interface Note {
  /** Primary key: LEAD#{leadId} */
  PK: string;
  /** Sort key: NOTE#{timestamp}#{noteId} */
  SK: string;
  /** ULID - sortable unique identifier */
  id: string;
  /** ID of the lead this note belongs to */
  leadId: string;
  /** Note content */
  content: string;
  /** Cognito user sub of the author */
  authorId: string;
  /** Denormalized display name of author */
  authorName: string;
  /** Note type: MANUAL (user-created) or SYSTEM (auto-logged changes) */
  type: NoteTypeValue;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}
