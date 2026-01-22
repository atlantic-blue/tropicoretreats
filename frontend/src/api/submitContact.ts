import env from '../env';
import { ContactFormData, SubmitContactResult } from '../types/contact';

const TIMEOUT_MS = 30000; // 30 seconds per design decision

/**
 * Submit contact form data to the leads API.
 * Handles timeout (30s), network errors, and API errors.
 * Returns structured result for UI feedback.
 */
export async function submitContact(data: ContactFormData): Promise<SubmitContactResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.api.contactUrl}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.message || 'Something went wrong. Please try again.',
      };
    }

    const result = await response.json();
    return {
      success: true,
      leadId: result.leadId,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timed out. Please check your connection and try again.',
        };
      }
    }

    // Network error (TypeError) or other unexpected error
    return {
      success: false,
      message: 'Unable to connect. Please check your internet and try again.',
    };
  }
}
