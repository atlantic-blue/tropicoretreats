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

export interface CrmEmailParams {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

/**
 * Send a CRM outbound email via SES and return the SES MessageId.
 *
 * Source defaults to FROM_EMAIL_CRM env var (Tropico Retreats branded address).
 * ReplyToAddresses is set to the bare team email extracted from the source.
 *
 * @param params - CRM email configuration
 * @returns Object containing the SES MessageId
 * @throws Error if SES send fails
 */
export const sendCrmEmail = async (
  params: CrmEmailParams
): Promise<{ messageId: string }> => {
  const source =
    process.env.FROM_EMAIL_CRM ?? 'Tropico Retreats <team@tropicoretreat.com>';

  // Extract bare email from "Display Name <email@domain>" format
  const replyToMatch = source.match(/<(.+?)>/);
  const replyTo = replyToMatch ? replyToMatch[1] : source;

  const body: {
    Text: { Data: string; Charset: string };
    Html?: { Data: string; Charset: string };
  } = {
    Text: { Data: params.bodyText, Charset: 'UTF-8' },
  };

  if (params.bodyHtml) {
    body.Html = { Data: params.bodyHtml, Charset: 'UTF-8' };
  }

  const response = await sesClient.send(
    new SendEmailCommand({
      Source: source,
      Destination: { ToAddresses: [params.to] },
      ReplyToAddresses: [replyTo],
      Message: {
        Subject: { Data: params.subject },
        Body: body,
      },
    })
  );

  if (!response.MessageId) {
    throw new Error('SES did not return a MessageId');
  }

  return { messageId: response.MessageId };
};
