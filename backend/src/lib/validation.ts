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
