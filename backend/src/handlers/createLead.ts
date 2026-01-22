import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { ulid } from 'ulidx';
import { LeadSchema } from '../lib/validation.js';
import type { Lead } from '../lib/types.js';
import { putLead } from '../lib/dynamodb.js';
import { created, badRequest, serverError } from '../utils/response.js';

/**
 * POST /leads Lambda handler
 *
 * Receives contact form submissions, validates input with Zod schema,
 * generates a ULID for the lead, and persists to DynamoDB with status=NEW.
 *
 * @param event - API Gateway HTTP API v2 event
 * @returns 201 on success, 400 on validation error, 500 on server error
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = JSON.parse(event.body ?? '{}');
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    // Validate input with Zod schema
    const validation = LeadSchema.safeParse(body);
    if (!validation.success) {
      return badRequest(
        'Validation failed',
        validation.error.flatten().fieldErrors
      );
    }

    // Generate ULID and timestamps
    const id = ulid();
    const now = new Date().toISOString();

    // Create Lead entity with DynamoDB keys
    const lead: Lead = {
      PK: `LEAD#${id}`,
      SK: `LEAD#${id}`,
      GSI1PK: 'STATUS#NEW',
      GSI1SK: now,
      id,
      status: 'NEW',
      firstName: validation.data.firstName,
      lastName: validation.data.lastName,
      email: validation.data.email,
      phone: validation.data.phone,
      company: validation.data.company,
      groupSize: validation.data.groupSize,
      preferredDates: validation.data.preferredDates,
      destination: validation.data.destination,
      message: validation.data.message,
      createdAt: now,
      updatedAt: now,
    };

    // Persist to DynamoDB
    await putLead(lead);

    // Return success response
    return created({
      id,
      message: 'Lead created successfully',
    });
  } catch (error) {
    // Log error for CloudWatch debugging
    console.error('Error creating lead:', error);

    // Return generic server error (don't expose internal details)
    return serverError();
  }
};
