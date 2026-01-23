/**
 * Format ISO timestamp to London timezone for emails.
 *
 * Example output: "Thursday, 23 January 2026 at 14:30"
 *
 * @param isoString - ISO 8601 timestamp
 * @returns Formatted date/time string in London timezone
 */
export const formatLondonTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(date);
};
