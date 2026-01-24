import { CognitoUserPool } from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
};

if (!poolData.UserPoolId || !poolData.ClientId) {
  throw new Error('Cognito environment variables not configured');
}

export const userPool = new CognitoUserPool(poolData);
