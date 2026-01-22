/**
 * Contact form data matching backend LeadSchema.
 * Required: firstName, lastName, email, message
 * Optional: phone, company, groupSize, preferredDates, destination
 */
export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  groupSize: string;
  preferredDates: string;
  destination: string;
  message: string;
}

/**
 * Initial empty form state for reset after successful submission.
 */
export const initialFormData: ContactFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  groupSize: '',
  preferredDates: '',
  destination: '',
  message: '',
};

/**
 * Result from submitContact API call.
 */
export interface SubmitContactResult {
  success: boolean;
  message?: string;
  leadId?: string;
}

/**
 * Form submission state machine states.
 */
export type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';
