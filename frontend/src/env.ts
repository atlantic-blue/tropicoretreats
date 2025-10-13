interface Env {
  auth: {
    baseUrl: string;
    logInUrl: string;
    logOutUrl: string;
    callbackUrl: string;
    clientId: string;
    clientSecret: string;
  };
  payments: {
    stripe: {
      key: string;
    };
  };
}

const createEnv = (): Env => {
  const authBaseUrl = process.env.AUTH_DOMAIN || '';

  return {
    auth: {
      baseUrl: authBaseUrl,
      logInUrl: `${authBaseUrl}/login`,
      logOutUrl: `${authBaseUrl}/logout`,
      callbackUrl: `${window.location.origin}/callback/`,
      clientId: process.env.AUTH_CLIENT_ID || '',
      clientSecret: process.env.AUTH_CLIENT_SECRET || '',
    },
    payments: {
      stripe: {
        key: process.env.PAYMENTS_STRIPE_KEY || '',
      },
    },
  };
};

export default createEnv();
