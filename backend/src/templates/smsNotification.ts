import type { Lead } from '../lib/types.js';

/**
 * Build concise SMS notification for a new lead.
 * Keeps message under 160 GSM characters to avoid multipart billing.
 *
 * Format: "Tropico Lead: {name} | {email} | {url}"
 */
export const buildSmsNotification = (
  lead: Lead,
  dashboardUrl: string
): string => {
  const name = lead.company || `${lead.firstName} ${lead.lastName}`;
  const shortUrl = `${dashboardUrl}/leads/${lead.id}`;

  // Base message without URL
  const base = `Tropico Lead: ${name}`;
  const withEmail = `${base} | ${lead.email}`;
  const full = `${withEmail} | ${shortUrl}`;

  // If full message fits, use it
  if (full.length <= 160) {
    return full;
  }

  // If message with email fits without URL, use that
  if (withEmail.length <= 160) {
    return withEmail;
  }

  // Truncate name to fit email
  const maxNameLen =
    160 - ' | '.length - lead.email.length - 'Tropico Lead: '.length;
  if (maxNameLen > 10) {
    return `Tropico Lead: ${name.substring(0, maxNameLen - 3)}... | ${lead.email}`;
  }

  // Fallback: just email
  return `Tropico Lead: ${lead.email}`;
};
