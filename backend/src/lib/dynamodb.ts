import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { Lead } from './types.js';

/**
 * DynamoDB client singleton - initialized outside handler for reuse across
 * warm Lambda invocations (reduces latency by ~100-200ms per invocation).
 */
const client = new DynamoDBClient({});

/**
 * DynamoDB Document Client - provides simplified JSON handling
 * without manual AttributeValue marshalling.
 */
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

/**
 * Table name from environment variable.
 * Set by Lambda environment configuration in Terraform.
 */
const TABLE_NAME = process.env.TABLE_NAME;

/**
 * Persists a lead to DynamoDB.
 *
 * @param lead - The lead entity to store
 * @throws Error if TABLE_NAME environment variable is not set
 * @throws DynamoDB service errors
 */
export const putLead = async (lead: Lead): Promise<void> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: lead,
    })
  );
};
