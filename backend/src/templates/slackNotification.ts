import type { Lead, Temperature } from '../lib/types.js';

/**
 * Temperature to Slack emoji mapping for visual lead priority indicator.
 */
const TEMPERATURE_EMOJI: Record<Temperature, string> = {
  HOT: ':fire:',
  WARM: ':sunny:',
  COLD: ':snowflake:',
};

/**
 * Result of building Slack notification blocks.
 */
export interface SlackNotificationResult {
  /** Block Kit blocks for rich message formatting */
  blocks: unknown[];
  /** Fallback text for notifications (required by Slack) */
  text: string;
}

/**
 * Build Slack Block Kit message for new lead notification.
 *
 * Message structure:
 * - Header: Temperature emoji + "New Lead: {displayName}"
 * - Section: Contact fields (name, email, phone, company)
 * - Section: Message content (truncated to 500 chars)
 * - Divider
 * - Context: Temperature indicator + Dashboard link
 *
 * @param lead - Lead entity from DynamoDB
 * @param dashboardUrl - Base URL of admin dashboard
 * @returns Block Kit blocks and fallback text
 */
export const buildLeadNotificationBlocks = (
  lead: Lead,
  dashboardUrl: string
): SlackNotificationResult => {
  const displayName = lead.company || `${lead.firstName} ${lead.lastName}`;
  const emoji = TEMPERATURE_EMOJI[lead.temperature] || TEMPERATURE_EMOJI.WARM;

  // Build contact fields array
  const fields: Array<{ type: string; text: string }> = [
    {
      type: 'mrkdwn',
      text: `*Name:*\n${lead.firstName} ${lead.lastName}`,
    },
    {
      type: 'mrkdwn',
      text: `*Email:*\n<mailto:${lead.email}|${lead.email}>`,
    },
  ];

  // Add optional fields if present
  if (lead.phone) {
    fields.push({
      type: 'mrkdwn',
      text: `*Phone:*\n${lead.phone}`,
    });
  }

  if (lead.company) {
    fields.push({
      type: 'mrkdwn',
      text: `*Company:*\n${lead.company}`,
    });
  }

  // Truncate message if longer than 500 chars
  const maxMessageLength = 500;
  const truncatedMessage =
    lead.message.length > maxMessageLength
      ? `${lead.message.substring(0, maxMessageLength)}...`
      : lead.message;

  // Build Block Kit message
  const blocks: unknown[] = [
    // Header block with emoji and display name
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} New Lead: ${displayName}`,
        emoji: true,
      },
    },
    // Contact details section
    {
      type: 'section',
      fields: fields,
    },
    // Message content section
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Message:*\n${truncatedMessage}`,
      },
    },
    // Visual divider
    {
      type: 'divider',
    },
    // Context with temperature and dashboard link
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Temperature: ${emoji} ${lead.temperature} | <${dashboardUrl}/leads/${lead.id}|View in Dashboard>`,
        },
      ],
    },
  ];

  // Fallback text for notifications
  const text = `New lead from ${displayName}`;

  return { blocks, text };
};
