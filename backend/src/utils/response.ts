import type { APIGatewayProxyResultV2 } from 'aws-lambda';

/**
 * HTTP response helpers for Lambda handlers.
 *
 * Note: CORS headers are handled by API Gateway cors_configuration.
 * Lambda only needs to return status code and body.
 */

/**
 * Returns a 201 Created response.
 *
 * @param data - Response body data
 */
export const created = (data: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 201,
  body: JSON.stringify(data),
});

/**
 * Returns a 400 Bad Request response.
 *
 * @param error - Error message
 * @param details - Optional field-level error details
 */
export const badRequest = (
  error: string,
  details?: unknown
): APIGatewayProxyResultV2 => ({
  statusCode: 400,
  body: JSON.stringify({ error, details }),
});

/**
 * Returns a 500 Internal Server Error response.
 *
 * @param message - Error message (default: 'Internal server error')
 */
export const serverError = (
  message = 'Internal server error'
): APIGatewayProxyResultV2 => ({
  statusCode: 500,
  body: JSON.stringify({ error: message }),
});

/**
 * Returns a 200 OK response.
 *
 * @param data - Response body data
 */
export const ok = (data: unknown): APIGatewayProxyResultV2 => ({
  statusCode: 200,
  body: JSON.stringify(data),
});

/**
 * Returns a 404 Not Found response.
 *
 * @param message - Error message (default: 'Not found')
 */
export const notFound = (message = 'Not found'): APIGatewayProxyResultV2 => ({
  statusCode: 404,
  body: JSON.stringify({ error: message }),
});
