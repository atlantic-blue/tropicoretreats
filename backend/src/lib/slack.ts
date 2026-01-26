import { IncomingWebhook } from '@slack/webhook';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

/**
 * Secrets Manager client singleton - initialized outside handler for reuse
 * across warm Lambda invocations.
 */
const secretsClient = new SecretsManagerClient({});

/**
 * Cached webhook URL and instance - preserved across warm Lambda invocations
 * to avoid repeated Secrets Manager calls (~100-200ms savings per invocation).
 */
let cachedWebhookUrl: string | null = null;
let webhookInstance: IncomingWebhook | null = null;

/**
 * Retrieve webhook URL from AWS Secrets Manager.
 * Uses module-level cache to avoid repeated API calls during warm starts.
 *
 * @returns Webhook URL from Secrets Manager
 * @throws Error if secret retrieval fails
 */
const getWebhookUrl = async (): Promise<string> => {
  if (cachedWebhookUrl) {
    return cachedWebhookUrl;
  }

  const secretName = process.env.SLACK_WEBHOOK_SECRET_NAME;
  if (!secretName) {
    throw new Error('SLACK_WEBHOOK_SECRET_NAME environment variable not set');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );

  if (!response.SecretString) {
    throw new Error('Slack webhook secret is empty');
  }

  cachedWebhookUrl = response.SecretString;
  return cachedWebhookUrl;
};

/**
 * Get or create IncomingWebhook instance.
 * Reuses cached instance across warm Lambda invocations.
 *
 * @returns Configured IncomingWebhook instance
 */
const getWebhook = async (): Promise<IncomingWebhook> => {
  if (webhookInstance) {
    return webhookInstance;
  }

  const webhookUrl = await getWebhookUrl();
  webhookInstance = new IncomingWebhook(webhookUrl);
  return webhookInstance;
};

/**
 * Send a message to Slack via incoming webhook.
 *
 * @param blocks - Slack Block Kit blocks for rich formatting
 * @param text - Fallback text for notifications (required by Slack)
 * @throws Error if webhook send fails (message logged without exposing URL)
 */
export const sendSlackNotification = async (
  blocks: unknown[],
  text: string
): Promise<void> => {
  try {
    const webhook = await getWebhook();
    await webhook.send({ blocks, text });
  } catch (error) {
    // Only log error message, not full error object (may contain webhook URL)
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Slack notification failed: ${message}`);
  }
};
