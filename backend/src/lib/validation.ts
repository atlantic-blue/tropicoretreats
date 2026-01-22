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
