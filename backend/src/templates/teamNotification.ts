import type { Lead } from '../lib/types.js';
import { formatLondonTime } from '../utils/formatTime.js';

export interface TeamNotificationEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate team notification email when a new lead is submitted.
 *
 * Email includes:
 * - All lead details in a formatted table
 * - Timestamp in London timezone
 * - Reply-to customer's email for direct response
 * - Link to admin dashboard (placeholder for Phase 5)
 *
 * @param lead - Lead entity from DynamoDB
 * @param adminDashboardUrl - URL to the admin dashboard
 * @returns Email content with subject, HTML, and plain text
 */
export const teamNotificationTemplate = (
  lead: Lead,
  adminDashboardUrl: string
): TeamNotificationEmail => {
  const displayName = lead.company || `${lead.firstName} ${lead.lastName}`;
  const formattedTime = formatLondonTime(lead.createdAt);

  const subject = `New Lead from ${displayName}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #1a365d; border-radius: 8px 8px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <img src="https://tropicoretreat.com/public/favicon.jpg" alt="Tropico Retreats" width="50" height="50" style="display: block; border-radius: 8px;">
                  </td>
                  <td align="right" style="color: #ffffff; font-size: 14px;">
                    ${formattedTime}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <h1 style="margin: 0; color: #1a365d; font-size: 24px; font-weight: 600;">New Lead Received</h1>
              <p style="margin: 10px 0 0; color: #666666; font-size: 16px;">A new enquiry has been submitted through the website.</p>
            </td>
          </tr>
          <!-- Lead Details -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600; width: 140px;">Name</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;">${lead.firstName} ${lead.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Email</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;"><a href="mailto:${lead.email}" style="color: #3182ce; text-decoration: none;">${lead.email}</a></td>
                </tr>
                ${lead.phone ? `<tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Phone</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;"><a href="tel:${lead.phone}" style="color: #3182ce; text-decoration: none;">${lead.phone}</a></td>
                </tr>` : ''}
                ${lead.company ? `<tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Company</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;">${lead.company}</td>
                </tr>` : ''}
                ${lead.destination ? `<tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Destination</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;">${lead.destination}</td>
                </tr>` : ''}
                ${lead.groupSize ? `<tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Group Size</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;">${lead.groupSize}</td>
                </tr>` : ''}
                ${lead.preferredDates ? `<tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #4a5568; font-weight: 600;">Preferred Dates</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1a202c;">${lead.preferredDates}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 15px 20px; background-color: #f7fafc; font-size: 14px; color: #4a5568; font-weight: 600; vertical-align: top;">Message</td>
                  <td style="padding: 15px 20px; background-color: #ffffff; font-size: 14px; color: #1a202c; line-height: 1.6;">${lead.message.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 40px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: #3182ce; border-radius: 6px;">
                    <a href="${adminDashboardUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">View in Dashboard</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f7fafc; border-radius: 0 0 8px 8px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #718096; font-size: 12px; text-align: center;">
                This email was sent automatically by Tropico Retreats Lead Management System.<br>
                Reply directly to this email to respond to the customer.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `NEW LEAD RECEIVED
================

A new enquiry has been submitted through the Tropico Retreats website.

LEAD DETAILS
------------
Name: ${lead.firstName} ${lead.lastName}
Email: ${lead.email}
${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.company ? `Company: ${lead.company}\n` : ''}${lead.destination ? `Destination: ${lead.destination}\n` : ''}${lead.groupSize ? `Group Size: ${lead.groupSize}\n` : ''}${lead.preferredDates ? `Preferred Dates: ${lead.preferredDates}\n` : ''}
Message:
${lead.message}

Submitted: ${formattedTime}

---
View in Dashboard: ${adminDashboardUrl}

Reply directly to this email to respond to the customer.`;

  return { subject, html, text };
};
