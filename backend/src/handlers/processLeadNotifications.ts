import type { DynamoDBStreamEvent } from 'aws-lambda';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import type { Lead } from '../lib/types.js';
import { sendEmail } from '../lib/ses.js';
import { teamNotificationTemplate } from '../templates/teamNotification.js';
import { customerAutoReplyTemplate } from '../templates/customerAutoReply.js';
import { generateReferenceNumber } from '../utils/referenceNumber.js';

/**
 * Environment variables required:
 * - TEAM_EMAILS: Comma-separated list of team email addresses
 * - FROM_EMAIL_TEAM: Sender email for team notifications (leads@tropicoretreat.com)
 * - FROM_EMAIL_CUSTOMER: Sender email for customer auto-reply (hello@tropicoretreat.com)
 * - FROM_NAME: Sender display name (Tropico Retreats)
 * - ADMIN_DASHBOARD_URL: URL to admin dashboard
 * - WHATSAPP_NUMBER: WhatsApp number for customer contact
 */
const TEAM_EMAILS = process.env.TEAM_EMAILS?.split(',').map((e) => e.trim()) ?? [];
const FROM_EMAIL_TEAM = process.env.FROM_EMAIL_TEAM ?? 'leads@tropicoretreat.com';
const FROM_EMAIL_CUSTOMER = process.env.FROM_EMAIL_CUSTOMER ?? 'hello@tropicoretreat.com';
const FROM_NAME = process.env.FROM_NAME ?? 'Tropico Retreats';
const ADMIN_DASHBOARD_URL = process.env.ADMIN_DASHBOARD_URL ?? 'https://admin.tropicoretreat.com';
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER ?? '+447000000000';

/**
 * Format email address with display name.
 * Example: "Tropico Retreats <leads@tropicoretreat.com>"
 */
const formatFromAddress = (email: string, name: string): string => {
  return `${name} <${email}>`;
};

/**
 * DynamoDB Streams handler for processing lead notifications.
 *
 * Triggered by INSERT events on the leads table. For each new lead:
 * 1. Sends team notification email with all lead details
 * 2. Sends customer auto-reply with reference number and 48-hour promise
 *
 * Both emails are sent independently - failure of one doesn't block the other.
 * Errors are logged for CloudWatch monitoring.
 *
 * @param event - DynamoDB Stream event with INSERT records
 */
export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log(`Processing ${event.Records.length} records`);

  for (const record of event.Records) {
    // Only process INSERT events (new leads)
    if (record.eventName !== 'INSERT') {
      console.log(`Skipping ${record.eventName} event`);
      continue;
    }

    // Extract and unmarshall the new lead data
    const newImage = record.dynamodb?.NewImage;
    if (!newImage) {
      console.error('No NewImage in stream record');
      continue;
    }

    const lead = unmarshall(
      newImage as Record<string, AttributeValue>
    ) as Lead;

    console.log(`Processing lead: ${lead.id} - ${lead.email}`);

    // Generate unique reference number for customer
    const referenceNumber = generateReferenceNumber();
    console.log(`Generated reference: ${referenceNumber}`);

    // Send team notification
    try {
      const teamEmail = teamNotificationTemplate(lead, ADMIN_DASHBOARD_URL);
      await sendEmail({
        to: TEAM_EMAILS,
        from: formatFromAddress(FROM_EMAIL_TEAM, FROM_NAME),
        replyTo: lead.email, // Reply goes directly to customer
        subject: teamEmail.subject,
        htmlBody: teamEmail.html,
        textBody: teamEmail.text,
      });
      console.log(`Team notification sent for lead ${lead.id}`);
    } catch (error) {
      console.error(`Failed to send team notification for lead ${lead.id}:`, error);
      // Continue to send customer email even if team notification fails
    }

    // Send customer auto-reply
    try {
      const customerEmail = customerAutoReplyTemplate(
        lead,
        referenceNumber,
        WHATSAPP_NUMBER
      );
      await sendEmail({
        to: [lead.email],
        from: formatFromAddress(FROM_EMAIL_CUSTOMER, FROM_NAME),
        replyTo: FROM_EMAIL_CUSTOMER, // Reply goes to team inbox
        subject: customerEmail.subject,
        htmlBody: customerEmail.html,
        textBody: customerEmail.text,
      });
      console.log(`Customer auto-reply sent for lead ${lead.id} with ref ${referenceNumber}`);
    } catch (error) {
      console.error(`Failed to send customer auto-reply for lead ${lead.id}:`, error);
      // Log error but don't throw - let stream processing continue
    }
  }

  console.log('Finished processing all records');
};
