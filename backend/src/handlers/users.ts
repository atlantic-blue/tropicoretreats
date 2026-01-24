import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { ok, serverError } from '../utils/response.js';

/**
 * Cognito client singleton - initialized outside handler for reuse
 * across warm Lambda invocations.
 */
const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * User Pool ID from environment variable.
 * Set by Lambda environment configuration in Terraform.
 */
const USER_POOL_ID = process.env.USER_POOL_ID;

/**
 * Lambda handler to list Cognito users for assignee dropdown.
 *
 * Only responds to GET /users.
 * Returns confirmed users with id, email, and username.
 */
export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  // Only respond to GET method
  if (event.requestContext.http.method !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!USER_POOL_ID) {
    console.error('USER_POOL_ID environment variable is not set');
    return serverError();
  }

  try {
    const response = await cognitoClient.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Limit: 60, // Max users for dropdown
      })
    );

    const users = (response.Users ?? [])
      .map((user) => ({
        id: user.Attributes?.find((a) => a.Name === 'sub')?.Value,
        email: user.Attributes?.find((a) => a.Name === 'email')?.Value,
        username: user.Username,
        status: user.UserStatus,
      }))
      .filter((u) => u.id && u.status === 'CONFIRMED');

    return ok({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return serverError();
  }
};
