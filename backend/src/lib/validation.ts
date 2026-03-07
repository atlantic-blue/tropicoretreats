import { z } from 'zod';

/**
 * Zod schema for lead creation input.
 * Matches the contact form fields in ContactPage.tsx:
 * - firstName, lastName, email, message are required
 * - phone, company, groupSize, preferredDates, destination are optional
 */
export const LeadSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less'),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less'),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .max(50, 'Phone number must be 50 characters or less')
    .optional(),
  company: z
    .string()
    .max(200, 'Company name must be 200 characters or less')
    .optional(),
  groupSize: z
    .string()
    .max(20, 'Group size must be 20 characters or less')
    .optional(),
  preferredDates: z
    .string()
    .max(100, 'Preferred dates must be 100 characters or less')
    .optional(),
  destination: z
    .string()
    .max(50, 'Destination must be 50 characters or less')
    .optional(),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(5000, 'Message must be 5000 characters or less'),
});

/** TypeScript type inferred from the Zod schema */
export type LeadInput = z.infer<typeof LeadSchema>;

/**
 * Zod schema for note creation (POST /leads/{id}/notes).
 */
export const NoteCreateSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
});

export type NoteCreateInput = z.infer<typeof NoteCreateSchema>;

/**
 * Zod schema for note update (PATCH /leads/{id}/notes/{noteId}).
 */
export const NoteUpdateSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
});

export type NoteUpdateInput = z.infer<typeof NoteUpdateSchema>;

/**
 * Zod schema for lead update (PATCH /leads/{id}).
 * At least one field must be provided.
 */
export const LeadUpdateSchema = z
  .object({
    status: z.enum(['NEW', 'CONTACTED', 'QUOTED', 'WON', 'LOST', 'ARCHIVED']).optional(),
    temperature: z.enum(['HOT', 'WARM', 'COLD']).optional(),
    assigneeId: z.string().optional(),
    assigneeName: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type LeadUpdateInput = z.infer<typeof LeadUpdateSchema>;

/**
 * Zod schema for sending an email to a lead (POST /emails/send).
 */
export const SendEmailRequestSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').max(100),
  to: z.string().email('Invalid recipient email address'),
  subject: z.string().min(1, 'Subject is required').max(500),
  bodyText: z.string().min(1, 'Body text is required').max(100_000),
  bodyHtml: z.string().max(500_000).optional(),
});

export type SendEmailRequestInput = z.infer<typeof SendEmailRequestSchema>;

/**
 * Slug format regex: lowercase alphanumeric segments separated by single hyphens.
 * Cannot start or end with a hyphen.
 */
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Custom Zod refinement for URL fields: only allows https:// protocol.
 * Prevents SSRF (file://, http://internal), XSS (javascript:), and
 * other dangerous URL schemes.
 */
const httpsUrl = z
  .string()
  .url()
  .refine(
    (value) => value.startsWith('https://'),
    { message: 'URL must use https:// protocol' }
  );

/**
 * Zod schema for creating a blog post (POST /v1/blog/posts).
 */
export const CreateBlogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z
    .string()
    .regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens')
    .max(200, 'Slug must be 200 characters or less')
    .optional(),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(102_400, 'Content must be 100KB or less'),
  heroImageUrl: httpsUrl.optional(),
  metaTitle: z.string().max(70, 'metaTitle must be 70 characters or less').optional(),
  metaDescription: z
    .string()
    .max(160, 'metaDescription must be 160 characters or less')
    .optional(),
  ogImageUrl: httpsUrl.optional(),
  authorName: z.string().max(100, 'Author name must be 100 characters or less').optional(),
  authorOrg: z.string().max(100, 'Author org must be 100 characters or less').optional(),
  status: z.enum(['draft', 'published']).optional(),
});

export type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;

/**
 * Zod schema for updating a blog post (PUT /v1/blog/posts/{id}).
 * At least one field must be provided.
 */
export const UpdateBlogPostSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title must be 200 characters or less')
      .optional(),
    slug: z
      .string()
      .regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens')
      .max(200, 'Slug must be 200 characters or less')
      .optional(),
    content: z
      .string()
      .min(1, 'Content cannot be empty')
      .max(102_400, 'Content must be 100KB or less')
      .optional(),
    heroImageUrl: httpsUrl.optional(),
    metaTitle: z.string().max(70, 'metaTitle must be 70 characters or less').optional(),
    metaDescription: z
      .string()
      .max(160, 'metaDescription must be 160 characters or less')
      .optional(),
    ogImageUrl: httpsUrl.optional(),
    authorName: z.string().max(100, 'Author name must be 100 characters or less').optional(),
    authorOrg: z.string().max(100, 'Author org must be 100 characters or less').optional(),
    status: z.enum(['draft', 'published']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateBlogPostInput = z.infer<typeof UpdateBlogPostSchema>;

/**
 * Status progression order for validation.
 * Leads should progress forward: NEW -> CONTACTED -> QUOTED -> WON/LOST
 * ARCHIVED is a special status that can be reached from any status.
 */
const STATUS_ORDER: Record<string, number> = {
  NEW: 0,
  CONTACTED: 1,
  QUOTED: 2,
  WON: 3,
  LOST: 3,
  ARCHIVED: 99, // Special value to allow archiving from any status
};

/**
 * Validates that status progression is valid.
 * - Leads can progress forward in the pipeline (NEW -> CONTACTED -> QUOTED -> WON/LOST)
 * - Any status can transition to ARCHIVED (archiving)
 * - ARCHIVED can transition to any status (restoring)
 *
 * @param currentStatus - Current status of the lead
 * @param newStatus - Proposed new status
 * @returns true if progression is valid
 */
export function validateStatusProgression(
  currentStatus: string,
  newStatus: string
): boolean {
  // Allow archiving from any status
  if (newStatus === 'ARCHIVED') {
    return currentStatus !== 'ARCHIVED'; // Can't archive already archived
  }

  // Allow restoring from ARCHIVED to any status
  if (currentStatus === 'ARCHIVED') {
    return STATUS_ORDER[newStatus] !== undefined;
  }

  const currentOrder = STATUS_ORDER[currentStatus];
  const newOrder = STATUS_ORDER[newStatus];

  // Allow if both statuses are valid and new status is at same or higher order
  if (currentOrder === undefined || newOrder === undefined) {
    return false;
  }

  return newOrder >= currentOrder;
}
