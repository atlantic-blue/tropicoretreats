import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { ulid } from 'ulidx';
import {
  LeadUpdateSchema,
  NoteCreateSchema,
  NoteUpdateSchema,
  validateStatusProgression,
} from '../lib/validation.js';
import {
  getLeads,
  getLead,
  updateLead,
  getNotes,
  putNote,
  updateNote,
} from '../lib/dynamodb.js';
import type { Note, NoteTypeValue } from '../lib/types.js';
import { NoteType } from '../lib/types.js';
import { created, ok, badRequest, serverError, notFound } from '../utils/response.js';

/**
 * Multi-route Lambda handler for admin lead operations.
 *
 * Routes:
 * - GET /leads - List leads with pagination/filters
 * - GET /leads/{id} - Get lead details with notes
 * - PATCH /leads/{id} - Update lead fields
 * - POST /leads/{id}/notes - Add a note
 * - PATCH /leads/{id}/notes/{noteId} - Edit a note
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;

  try {
    // Route: GET /leads - List leads with pagination/filters
    if (method === 'GET' && path === '/leads') {
      return handleGetLeads(event);
    }

    // Route: GET /leads/{id} - Get lead details with notes
    if (method === 'GET' && path.match(/^\/leads\/[^/]+$/)) {
      return handleGetLead(event);
    }

    // Route: PATCH /leads/{id} - Update lead
    if (method === 'PATCH' && path.match(/^\/leads\/[^/]+$/) && !path.includes('/notes')) {
      return handleUpdateLead(event);
    }

    // Route: POST /leads/{id}/notes - Add note
    if (method === 'POST' && path.match(/^\/leads\/[^/]+\/notes$/)) {
      return handleAddNote(event);
    }

    // Route: PATCH /leads/{id}/notes/{noteId} - Edit note
    if (method === 'PATCH' && path.match(/^\/leads\/[^/]+\/notes\/[^/]+$/)) {
      return handleEditNote(event);
    }

    // Method not allowed
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error in leadsAdmin handler:', error);
    return serverError();
  }
};

/**
 * GET /leads - List leads with pagination and filters.
 */
async function handleGetLeads(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const queryParams = event.queryStringParameters ?? {};

  // Parse query parameters
  const status = queryParams.status?.split(',').filter(Boolean);
  const temperature = queryParams.temperature?.split(',').filter(Boolean);
  const assigneeId = queryParams.assigneeId;
  const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : undefined;
  const lastKey = queryParams.lastKey;

  // Validate limit if provided
  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    return badRequest('Invalid limit parameter. Must be between 1 and 100.');
  }

  const result = await getLeads({
    status,
    temperature,
    assigneeId,
    limit,
    lastKey,
  });

  return ok({
    leads: result.leads,
    nextPage: result.nextKey,
    count: result.count,
  });
}

/**
 * GET /leads/{id} - Get lead details with notes.
 */
async function handleGetLead(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const id = event.pathParameters?.id;

  if (!id) {
    return badRequest('Lead ID is required');
  }

  const lead = await getLead(id);

  if (!lead) {
    return notFound('Lead not found');
  }

  const notes = await getNotes(id);

  return ok({
    ...lead,
    notes,
  });
}

/**
 * PATCH /leads/{id} - Update lead fields with status progression validation.
 */
async function handleUpdateLead(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const id = event.pathParameters?.id;

  if (!id) {
    return badRequest('Lead ID is required');
  }

  // Parse request body
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  // Validate input
  const validation = LeadUpdateSchema.safeParse(body);
  if (!validation.success) {
    return badRequest('Validation failed', validation.error.flatten().fieldErrors);
  }

  const updates = validation.data;

  // Get current lead for status validation
  const currentLead = await getLead(id);
  if (!currentLead) {
    return notFound('Lead not found');
  }

  // Validate status progression if status is being changed
  if (updates.status && updates.status !== currentLead.status) {
    const isValidProgression = validateStatusProgression(
      currentLead.status,
      updates.status
    );

    if (!isValidProgression) {
      return badRequest(
        `Invalid status progression: cannot change from ${currentLead.status} to ${updates.status}`
      );
    }
  }

  // Update the lead
  const updatedLead = await updateLead(id, updates);

  // Extract author info from JWT claims for system notes
  const authorId = event.requestContext.authorizer?.jwt?.claims?.sub as string;
  const authorName =
    (event.requestContext.authorizer?.jwt?.claims?.email as string) ||
    (event.requestContext.authorizer?.jwt?.claims?.username as string) ||
    'System';

  // Create system notes for tracked field changes
  const changedFields: { field: string; oldValue: string; newValue: string }[] = [];

  if (updates.status && updates.status !== currentLead.status) {
    changedFields.push({
      field: 'status',
      oldValue: currentLead.status,
      newValue: updates.status,
    });
  }

  if (updates.temperature && updates.temperature !== currentLead.temperature) {
    changedFields.push({
      field: 'temperature',
      oldValue: currentLead.temperature,
      newValue: updates.temperature,
    });
  }

  if (updates.assigneeId && updates.assigneeId !== currentLead.assigneeId) {
    changedFields.push({
      field: 'assignee',
      oldValue: currentLead.assigneeName ?? 'Unassigned',
      newValue: updates.assigneeName ?? updates.assigneeId,
    });
  }

  // Create system notes for each change
  for (const change of changedFields) {
    const now = new Date().toISOString();
    const noteId = ulid();
    const systemNote: Note = {
      PK: `LEAD#${id}`,
      SK: `NOTE#${now}#${noteId}`,
      id: noteId,
      leadId: id,
      content: `${authorName} changed ${change.field} from ${change.oldValue} to ${change.newValue}`,
      authorId: authorId || 'system',
      authorName,
      type: NoteType.SYSTEM as NoteTypeValue,
      createdAt: now,
      updatedAt: now,
    };

    await putNote(systemNote);
  }

  return ok(updatedLead);
}

/**
 * POST /leads/{id}/notes - Add a manual note to a lead.
 */
async function handleAddNote(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const leadId = event.pathParameters?.id;

  if (!leadId) {
    return badRequest('Lead ID is required');
  }

  // Verify lead exists
  const lead = await getLead(leadId);
  if (!lead) {
    return notFound('Lead not found');
  }

  // Parse request body
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  // Validate input
  const validation = NoteCreateSchema.safeParse(body);
  if (!validation.success) {
    return badRequest('Validation failed', validation.error.flatten().fieldErrors);
  }

  // Extract author info from JWT claims
  const authorId = event.requestContext.authorizer?.jwt?.claims?.sub as string;
  const authorName =
    (event.requestContext.authorizer?.jwt?.claims?.email as string) ||
    (event.requestContext.authorizer?.jwt?.claims?.username as string) ||
    'Unknown';

  if (!authorId) {
    return badRequest('Author ID not found in token');
  }

  // Create the note
  const now = new Date().toISOString();
  const noteId = ulid();
  const note: Note = {
    PK: `LEAD#${leadId}`,
    SK: `NOTE#${now}#${noteId}`,
    id: noteId,
    leadId,
    content: validation.data.content,
    authorId,
    authorName,
    type: NoteType.MANUAL as NoteTypeValue,
    createdAt: now,
    updatedAt: now,
  };

  await putNote(note);

  return created(note);
}

/**
 * PATCH /leads/{id}/notes/{noteId} - Edit an existing note.
 */
async function handleEditNote(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> {
  const leadId = event.pathParameters?.id;
  const noteId = event.pathParameters?.noteId;

  if (!leadId) {
    return badRequest('Lead ID is required');
  }

  if (!noteId) {
    return badRequest('Note ID is required');
  }

  // Parse request body
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  // Validate input
  const validation = NoteUpdateSchema.safeParse(body);
  if (!validation.success) {
    return badRequest('Validation failed', validation.error.flatten().fieldErrors);
  }

  try {
    const updatedNote = await updateNote(leadId, noteId, validation.data.content);
    return ok(updatedNote);
  } catch (error) {
    if (error instanceof Error && error.message === 'Note not found') {
      return notFound('Note not found');
    }
    throw error;
  }
}
