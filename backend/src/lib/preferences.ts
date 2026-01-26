import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { NotificationPreferences, NotificationChannels } from './types.js';
import { DEFAULT_CHANNELS } from './types.js';

const TABLE_NAME = process.env.TABLE_NAME ?? 'tropico-leads-production';

/**
 * Get notification preferences for a user.
 * Returns default preferences if none exist.
 */
export const getPreferences = async (
  client: DynamoDBDocumentClient,
  userId: string
): Promise<NotificationPreferences> => {
  const result = await client.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PREFS#notifications',
      },
    })
  );

  if (result.Item) {
    return result.Item as NotificationPreferences;
  }

  // Return defaults if no record exists
  const now = new Date().toISOString();
  return {
    PK: `USER#${userId}`,
    SK: 'PREFS#notifications',
    userId,
    channels: { ...DEFAULT_CHANNELS },
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Update notification preferences for a user.
 * Creates record if it doesn't exist.
 */
export const updatePreferences = async (
  client: DynamoDBDocumentClient,
  userId: string,
  channels: Partial<NotificationChannels>,
  phone?: string
): Promise<NotificationPreferences> => {
  const existing = await getPreferences(client, userId);
  const now = new Date().toISOString();

  const updatedChannels = { ...existing.channels, ...channels };
  const smsEnabled = updatedChannels.sms && !!phone;

  const updated: NotificationPreferences = {
    PK: `USER#${userId}`,
    SK: 'PREFS#notifications',
    userId,
    channels: updatedChannels,
    phone: phone ?? existing.phone,
    createdAt: existing.createdAt,
    updatedAt: now,
    // Set GSI1 keys only if SMS is enabled with a valid phone
    ...(smsEnabled ? { GSI1PK: 'PREFS#sms-enabled', GSI1SK: userId } : {}),
  };

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updated,
    })
  );

  return updated;
};

/**
 * Get all users with SMS notifications enabled.
 * Uses GSI1 for efficient lookup.
 */
export const getSmsEnabledUsers = async (
  client: DynamoDBDocumentClient
): Promise<NotificationPreferences[]> => {
  const result = await client.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': 'PREFS#sms-enabled',
      },
    })
  );

  return (result.Items ?? []) as NotificationPreferences[];
};
