import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Lead, Note } from './types.js';

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

/**
 * Parameters for querying leads with optional filters and pagination.
 */
export interface GetLeadsParams {
  /** Filter by status (multi-select) */
  status?: string[];
  /** Filter by temperature (multi-select) */
  temperature?: string[];
  /** Filter by assigned team member */
  assigneeId?: string;
  /** Search in firstName, lastName, email (case-insensitive) */
  search?: string;
  /** Filter by creation date (from, inclusive) - YYYY-MM-DD */
  dateFrom?: string;
  /** Filter by creation date (to, inclusive) - YYYY-MM-DD */
  dateTo?: string;
  /** Page size (default 15) */
  limit?: number;
  /** Pagination cursor (base64 encoded LastEvaluatedKey) */
  lastKey?: string;
}

/**
 * Result from getLeads query including pagination info.
 */
export interface GetLeadsResult {
  /** Array of matching leads */
  leads: Lead[];
  /** Pagination cursor for next page (undefined if no more results) */
  nextKey?: string;
  /** Total count of leads matching filters (for pagination UI) */
  totalCount: number;
}

/**
 * Query leads with optional filters and pagination.
 * Uses GSI1 for status-based queries or Scan for other filters.
 *
 * NOTE: For MVP with small dataset, scan is acceptable.
 * Production would need GSI per filter dimension.
 *
 * @param params - Query parameters with optional filters
 * @returns Paginated list of leads
 */
export const getLeads = async (
  params: GetLeadsParams = {}
): Promise<GetLeadsResult> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const { status, temperature, assigneeId, search, dateFrom, dateTo, limit = 15, lastKey } = params;
  const searchLower = search?.toLowerCase();

  // Parse pagination cursor
  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (lastKey) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(lastKey, 'base64').toString('utf-8')
      );
    } catch {
      throw new Error('Invalid pagination cursor');
    }
  }

  // Build filter expressions
  const filterExpressions: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, unknown> = {};

  // Always filter to only LEAD items (not NOTE items)
  filterExpressions.push('begins_with(SK, :skPrefix)');
  expressionAttributeValues[':skPrefix'] = 'LEAD#';

  // Add status filter
  if (status && status.length > 0) {
    const statusConditions = status.map((s, i) => {
      expressionAttributeValues[`:status${i}`] = s;
      return `#status = :status${i}`;
    });
    filterExpressions.push(`(${statusConditions.join(' OR ')})`);
    expressionAttributeNames['#status'] = 'status';
  }

  // Add temperature filter
  if (temperature && temperature.length > 0) {
    const tempConditions = temperature.map((t, i) => {
      expressionAttributeValues[`:temp${i}`] = t;
      return '#temperature = :temp' + i;
    });
    filterExpressions.push(`(${tempConditions.join(' OR ')})`);
    expressionAttributeNames['#temperature'] = 'temperature';
  }

  // Add assignee filter
  if (assigneeId) {
    filterExpressions.push('#assigneeId = :assigneeId');
    expressionAttributeNames['#assigneeId'] = 'assigneeId';
    expressionAttributeValues[':assigneeId'] = assigneeId;
  }

  // Add date range filter
  if (dateFrom || dateTo) {
    expressionAttributeNames['#createdAt'] = 'createdAt';
    if (dateFrom && dateTo) {
      // Between filter (inclusive)
      filterExpressions.push('#createdAt BETWEEN :dateFrom AND :dateTo');
      expressionAttributeValues[':dateFrom'] = `${dateFrom}T00:00:00.000Z`;
      expressionAttributeValues[':dateTo'] = `${dateTo}T23:59:59.999Z`;
    } else if (dateFrom) {
      // From date only
      filterExpressions.push('#createdAt >= :dateFrom');
      expressionAttributeValues[':dateFrom'] = `${dateFrom}T00:00:00.000Z`;
    } else if (dateTo) {
      // To date only
      filterExpressions.push('#createdAt <= :dateTo');
      expressionAttributeValues[':dateTo'] = `${dateTo}T23:59:59.999Z`;
    }
  }

  const filterExpression =
    filterExpressions.length > 0 ? filterExpressions.join(' AND ') : undefined;

  // First, get total count with same filters (but no pagination)
  const countResult = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Select: 'COUNT',
      FilterExpression: filterExpression,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0
          ? expressionAttributeNames
          : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );

  // For search, we need to do client-side filtering (DynamoDB doesn't support case-insensitive contains)
  // Fetch more items if searching to account for filtered results
  const fetchLimit = searchLower ? limit * 3 : limit;

  // Then get paginated results
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit: fetchLimit,
      ExclusiveStartKey: exclusiveStartKey,
      FilterExpression: filterExpression,
      ExpressionAttributeNames:
        Object.keys(expressionAttributeNames).length > 0
          ? expressionAttributeNames
          : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );

  // Apply client-side search filter (case-insensitive)
  let leads = (result.Items ?? []) as Lead[];
  if (searchLower) {
    leads = leads.filter(lead => {
      const searchableText = [
        lead.firstName,
        lead.lastName,
        lead.email,
        lead.company,
        lead.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(searchLower);
    });
  }

  // Apply limit after search filtering
  const paginatedLeads = leads.slice(0, limit);

  // Encode pagination cursor
  let nextKey: string | undefined;
  // If we have more results from DynamoDB or more filtered results than the limit
  if (result.LastEvaluatedKey || leads.length > limit) {
    // Use the last item's key as cursor if we filtered results
    if (leads.length > limit && paginatedLeads.length > 0) {
      const lastLead = paginatedLeads[paginatedLeads.length - 1];
      nextKey = Buffer.from(JSON.stringify({
        PK: lastLead.PK,
        SK: lastLead.SK,
      })).toString('base64');
    } else if (result.LastEvaluatedKey) {
      nextKey = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
        'base64'
      );
    }
  }

  // Adjust total count for search (need separate count query with search)
  let totalCount = countResult.Count ?? 0;
  if (searchLower) {
    // For search, we need to count matching items
    // This is expensive but necessary for accurate pagination
    // For large datasets, consider using OpenSearch
    let allItems: Lead[] = [];
    let scanKey: Record<string, unknown> | undefined;
    do {
      const countScan = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: filterExpression,
          ExpressionAttributeNames:
            Object.keys(expressionAttributeNames).length > 0
              ? expressionAttributeNames
              : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
          ExclusiveStartKey: scanKey,
        })
      );
      const items = (countScan.Items ?? []) as Lead[];
      allItems = allItems.concat(
        items.filter(lead => {
          const searchableText = [
            lead.firstName,
            lead.lastName,
            lead.email,
            lead.company,
            lead.message,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return searchableText.includes(searchLower);
        })
      );
      scanKey = countScan.LastEvaluatedKey;
    } while (scanKey);
    totalCount = allItems.length;
  }

  return {
    leads: paginatedLeads,
    nextKey,
    totalCount,
  };
};

/**
 * Get a single lead by ID.
 *
 * @param id - Lead ULID
 * @returns Lead entity or null if not found
 */
export const getLead = async (id: string): Promise<Lead | null> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `LEAD#${id}`,
        SK: `LEAD#${id}`,
      },
    })
  );

  return (result.Item as Lead) ?? null;
};

/**
 * Partial update of lead fields.
 * Auto-sets updatedAt and updates GSI1PK if status changed.
 *
 * @param id - Lead ULID
 * @param updates - Partial lead fields to update
 * @returns Updated lead entity
 * @throws Error if lead not found
 */
export const updateLead = async (
  id: string,
  updates: Partial<
    Pick<Lead, 'status' | 'temperature' | 'assigneeId' | 'assigneeName'>
  >
): Promise<Lead> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const now = new Date().toISOString();
  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, unknown> = {
    ':updatedAt': now,
  };

  // Add status update and GSI1PK update
  if (updates.status !== undefined) {
    updateExpressions.push('#status = :status');
    updateExpressions.push('GSI1PK = :gsi1pk');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = updates.status;
    expressionAttributeValues[':gsi1pk'] = `STATUS#${updates.status}`;
  }

  // Add temperature update
  if (updates.temperature !== undefined) {
    updateExpressions.push('#temperature = :temperature');
    expressionAttributeNames['#temperature'] = 'temperature';
    expressionAttributeValues[':temperature'] = updates.temperature;
  }

  // Add assignee updates
  if (updates.assigneeId !== undefined) {
    updateExpressions.push('#assigneeId = :assigneeId');
    expressionAttributeNames['#assigneeId'] = 'assigneeId';
    expressionAttributeValues[':assigneeId'] = updates.assigneeId;
  }

  if (updates.assigneeName !== undefined) {
    updateExpressions.push('#assigneeName = :assigneeName');
    expressionAttributeNames['#assigneeName'] = 'assigneeName';
    expressionAttributeValues[':assigneeName'] = updates.assigneeName;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `LEAD#${id}`,
        SK: `LEAD#${id}`,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Lead;
};

/**
 * Get notes for a lead, sorted by creation date (newest first).
 *
 * @param leadId - Lead ULID
 * @returns Array of notes for the lead
 */
export const getNotes = async (leadId: string): Promise<Note[]> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': `LEAD#${leadId}`,
        ':skPrefix': 'NOTE#',
      },
      ScanIndexForward: false, // Descending order (newest first)
    })
  );

  return (result.Items ?? []) as Note[];
};

/**
 * Create a note for a lead.
 *
 * @param note - Note entity to store
 */
export const putNote = async (note: Note): Promise<void> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: note,
    })
  );
};

/**
 * Update note content.
 *
 * @param leadId - Lead ULID
 * @param noteId - Note ULID
 * @param content - New note content
 * @returns Updated note entity
 * @throws Error if note not found
 */
export const updateNote = async (
  leadId: string,
  noteId: string,
  content: string
): Promise<Note> => {
  if (!TABLE_NAME) {
    throw new Error('TABLE_NAME environment variable is not set');
  }

  // First, find the note by querying with the noteId in the SK
  const queryResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'id = :noteId',
      ExpressionAttributeValues: {
        ':pk': `LEAD#${leadId}`,
        ':skPrefix': 'NOTE#',
        ':noteId': noteId,
      },
    })
  );

  if (!queryResult.Items || queryResult.Items.length === 0) {
    throw new Error('Note not found');
  }

  const existingNote = queryResult.Items[0] as Note;
  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: existingNote.PK,
        SK: existingNote.SK,
      },
      UpdateExpression: 'SET #content = :content, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#content': 'content',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':content': content,
        ':updatedAt': now,
      },
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes as Note;
};
