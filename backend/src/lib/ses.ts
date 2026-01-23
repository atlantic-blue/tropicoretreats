import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * SES client singleton - initialized outside handler for reuse across
 * warm Lambda invocations (reduces latency by ~100-200ms per invocation).
 */
const sesClient = new SESClient({});

export interface EmailParams {
  to: string[];
  from: string;
  replyTo: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Send email via SES.
 *
 * @param params - Email configuration including recipients, sender, and content
 * @throws Error if SES send fails
 */
export const sendEmail = async (params: EmailParams): Promise<void> => {
  await sesClient.send(
    new SendEmailCommand({
      Source: params.from,
      Destination: { ToAddresses: params.to },
      ReplyToAddresses: [params.replyTo],
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: params.htmlBody, Charset: 'UTF-8' },
          Text: { Data: params.textBody, Charset: 'UTF-8' },
        },
      },
    })
  );
};
