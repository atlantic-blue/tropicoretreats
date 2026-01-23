import crypto from 'crypto';

/**
 * Generate unique reference number in format TR-YYYY-XXXXXX.
 *
 * Example: TR-2026-A3F7B2
 *
 * @returns Reference number string for customer enquiry tracking
 */
export const generateReferenceNumber = (): string => {
  const year = new Date().getFullYear();
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TR-${year}-${randomPart}`;
};
