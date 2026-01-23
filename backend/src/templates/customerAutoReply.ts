import type { Lead } from '../lib/types.js';
import { formatLondonTime } from '../utils/formatTime.js';

export interface CustomerAutoReplyEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Generate customer auto-reply email confirming enquiry receipt.
 *
 * Email includes:
 * - Warm greeting with customer's name
 * - Unique reference number for follow-up
 * - Echo of submitted details
 * - 48-hour response promise
 * - WhatsApp contact option
 * - Social media links in footer
 *
 * @param lead - Lead entity from DynamoDB
 * @param referenceNumber - Unique reference TR-YYYY-XXXXXX
 * @param whatsappNumber - WhatsApp number for contact
 * @returns Email content with subject, HTML, and plain text
 */
export const customerAutoReplyTemplate = (
  lead: Lead,
  referenceNumber: string,
  whatsappNumber: string
): CustomerAutoReplyEmail => {
  const formattedTime = formatLondonTime(lead.createdAt);
  const currentYear = new Date().getFullYear();

  // Include destination in subject if selected
  const subject = lead.destination
    ? `Your ${lead.destination} Retreat Enquiry`
    : 'Your Tropico Retreats Enquiry';

  // WhatsApp link with pre-filled message
  const whatsappMessage = encodeURIComponent(
    `Hi! I just submitted an enquiry on your website (Ref: ${referenceNumber}) and had a quick question.`
  );
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You for Your Enquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 30px; background-color: #1a365d; border-radius: 8px 8px 0 0;">
              <img src="https://tropicoretreat.com/public/favicon.jpg" alt="Tropico Retreats" width="80" height="80" style="display: block; border-radius: 12px; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Thank You, ${lead.firstName}!</h1>
            </td>
          </tr>
          <!-- Reference Number -->
          <tr>
            <td align="center" style="padding: 30px 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="background-color: #ebf8ff; border-radius: 8px; border: 1px solid #bee3f8;">
                <tr>
                  <td style="padding: 15px 25px;">
                    <p style="margin: 0; color: #2c5282; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Your Reference Number</p>
                    <p style="margin: 5px 0 0; color: #1a365d; font-size: 24px; font-weight: 700; letter-spacing: 2px;">${referenceNumber}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding: 10px 40px 30px;">
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.7;">
                We've received your enquiry and we're excited to help you plan an unforgettable retreat experience! Our team will review your details and get back to you within <strong style="color: #1a365d;">48 hours</strong>.
              </p>
              <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.7;">
                Need a faster response? Send us a message on WhatsApp and we'll get back to you right away.
              </p>
              <!-- WhatsApp Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #25D366; border-radius: 6px;">
                    <a href="${whatsappLink}" style="display: inline-block; padding: 14px 28px; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none;">
                      Message us on WhatsApp
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Enquiry Summary -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <h2 style="margin: 0 0 15px; color: #1a365d; font-size: 18px; font-weight: 600;">Your Enquiry Details</h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600; width: 130px;">Name</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.firstName} ${lead.lastName}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Email</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.email}</td>
                </tr>
                ${lead.phone ? `<tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Phone</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.phone}</td>
                </tr>` : ''}
                ${lead.company ? `<tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Company</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.company}</td>
                </tr>` : ''}
                ${lead.destination ? `<tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Destination</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.destination}</td>
                </tr>` : ''}
                ${lead.groupSize ? `<tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Group Size</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.groupSize}</td>
                </tr>` : ''}
                ${lead.preferredDates ? `<tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #4a5568; font-weight: 600;">Preferred Dates</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #1a202c;">${lead.preferredDates}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 12px 15px; background-color: #f7fafc; font-size: 13px; color: #4a5568; font-weight: 600; vertical-align: top;">Message</td>
                  <td style="padding: 12px 15px; background-color: #ffffff; font-size: 13px; color: #1a202c; line-height: 1.5;">${lead.message.replace(/\n/g, '<br>')}</td>
                </tr>
              </table>
              <p style="margin: 15px 0 0; color: #718096; font-size: 12px;">Submitted on ${formattedTime}</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #1a365d; border-radius: 0 0 8px 8px;">
              <!-- Social Links -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://instagram.com/tropicoretreat" style="display: inline-block;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" alt="Instagram" width="28" height="28" style="display: block;">
                    </a>
                  </td>
                  <td style="padding: 0 10px;">
                    <a href="https://linkedin.com/company/tropicoretreat" style="display: inline-block;">
                      <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" width="28" height="28" style="display: block;">
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Company Info -->
              <p style="margin: 0 0 10px; color: #a0aec0; font-size: 12px; text-align: center; line-height: 1.6;">
                Tropico Retreats<br>
                London, United Kingdom
              </p>
              <p style="margin: 0; color: #718096; font-size: 11px; text-align: center;">
                &copy; ${currentYear} Tropico Retreats. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `THANK YOU, ${lead.firstName.toUpperCase()}!
${'='.repeat(20 + lead.firstName.length)}

We've received your enquiry and we're excited to help you plan an unforgettable retreat experience!

YOUR REFERENCE NUMBER: ${referenceNumber}

Our team will review your details and get back to you within 48 hours.

Need a faster response? Message us on WhatsApp:
${whatsappLink}

---

YOUR ENQUIRY DETAILS
--------------------
Name: ${lead.firstName} ${lead.lastName}
Email: ${lead.email}
${lead.phone ? `Phone: ${lead.phone}\n` : ''}${lead.company ? `Company: ${lead.company}\n` : ''}${lead.destination ? `Destination: ${lead.destination}\n` : ''}${lead.groupSize ? `Group Size: ${lead.groupSize}\n` : ''}${lead.preferredDates ? `Preferred Dates: ${lead.preferredDates}\n` : ''}
Message:
${lead.message}

Submitted: ${formattedTime}

---

Follow us:
Instagram: https://instagram.com/tropicoretreat
LinkedIn: https://linkedin.com/company/tropicoretreat

Tropico Retreats
London, United Kingdom

(c) ${currentYear} Tropico Retreats. All rights reserved.`;

  return { subject, html, text };
};
