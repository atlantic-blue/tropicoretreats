/** Email direction: outbound (sent by team) or inbound (received from lead) */
export type EmailDirection = 'outbound' | 'inbound';

/**
 * Email attachment metadata stored alongside an email record.
 */
export interface EmailAttachment {
  /** Filename of the attachment */
  filename: string;
  /** S3 key where the attachment content is stored */
  s3Key: string;
  /** MIME type of the attachment */
  contentType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Email record entity stored in DynamoDB co-located with its lead.
 *
 * Table design:
 * - PK: LEAD#{leadId} (co-located with lead for efficient queries)
 * - SK: EMAIL#{timestamp}#{messageId} (chronological ordering, unique)
 */
export interface Email {
  /** Primary key: LEAD#{leadId} */
  PK: string;
  /** Sort key: EMAIL#{timestamp}#{messageId} */
  SK: string;
  /** SES MessageId used as record identifier */
  id: string;
  /** ID of the lead this email belongs to */
  leadId: string;
  /** Email direction */
  direction: EmailDirection;
  /** Sender address (bare email, e.g. team@tropicoretreat.com) */
  fromAddress: string;
  /** Recipient address */
  toAddress: string;
  /** Email subject line */
  subject: string;
  /** Plain text body */
  bodyText: string;
  /** HTML body (optional) */
  bodyHtml?: string;
  /** Email attachments */
  attachments: EmailAttachment[];
  /** ISO 8601 timestamp when the email was sent */
  sentAt: string;
  /** ISO 8601 timestamp when the email was read (null if unread) */
  readAt: string | null;
  /** S3 key for stored email content (null for outbound) */
  s3Key: string | null;
  /** Email/sub of the operator who sent the email */
  operator: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

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
  /** ISO 8601 timestamp of the last email sent to or received from this lead */
  lastEmailAt?: string;
  /** Count of unread emails from this lead */
  unreadEmailCount?: number;
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

/**
 * Blog post entity type with DynamoDB keys and GSI attributes.
 *
 * Table design:
 * - PK/SK: BLOG#{id} for single-item access
 * - GSI1PK/GSI1SK: BLOG#PUBLISHED/publishedAt for listing published posts
 */
export interface BlogPostItem {
  /** Primary key: BLOG#{id} */
  PK: string;
  /** Sort key: BLOG#{id} */
  SK: string;
  /** GSI1 hash key: BLOG#PUBLISHED (only when status=published) */
  GSI1PK: string;
  /** GSI1 sort key: ISO 8601 publishedAt */
  GSI1SK: string;
  /** ULID - sortable unique identifier */
  id: string;
  /** Blog post title */
  title: string;
  /** URL-safe slug for the post */
  slug: string;
  /** Markdown content */
  content: string;
  /** Auto-generated excerpt from content */
  excerpt: string;
  /** CloudFront URL for hero image */
  heroImageUrl: string;
  /** SEO meta title */
  metaTitle: string;
  /** SEO meta description */
  metaDescription: string;
  /** Open Graph image URL */
  ogImageUrl: string;
  /** Author name extracted from JWT */
  authorName: string;
  /** Author organization */
  authorOrg: string;
  /** Post status */
  status: 'published' | 'deleted';
  /** ISO 8601 publish timestamp */
  publishedAt: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt: string;
}

/**
 * Slug index item for enforcing global slug uniqueness.
 *
 * Table design:
 * - PK/SK: SLUG#{slug} for single-item conditional writes
 */
export interface SlugIndexItem {
  /** Primary key: SLUG#{slug} */
  PK: string;
  /** Sort key: SLUG#{slug} */
  SK: string;
  /** URL-safe slug */
  slug: string;
  /** ULID of the associated blog post */
  blogId: string;
}

/** Notification channel settings */
export interface NotificationChannels {
  email: boolean;
  slack: boolean;
  sms: boolean;
}

/** Default notification channels for new users */
export const DEFAULT_CHANNELS: NotificationChannels = {
  email: true,
  slack: true,
  sms: false, // Requires phone setup
};

/**
 * User notification preferences entity.
 *
 * Table design:
 * - PK: USER#{userId} (co-located with user data)
 * - SK: PREFS#notifications
 * - GSI1PK: PREFS#sms-enabled (for querying SMS recipients)
 * - GSI1SK: userId
 */
export interface NotificationPreferences {
  /** Primary key: USER#{userId} */
  PK: string;
  /** Sort key: PREFS#notifications */
  SK: string;
  /** GSI1 hash key: PREFS#sms-enabled (only set when SMS enabled) */
  GSI1PK?: string;
  /** GSI1 sort key: userId */
  GSI1SK?: string;
  /** Cognito user sub */
  userId: string;
  /** Channel enable/disable settings */
  channels: NotificationChannels;
  /** Phone number in E.164 format for SMS */
  phone?: string;
  /** ISO 8601 timestamp of creation */
  createdAt: string;
  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}
