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
  status: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';
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
} as const;

export type LeadStatusType = (typeof LeadStatus)[keyof typeof LeadStatus];
