import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
  IAuthenticationCallback,
} from 'amazon-cognito-identity-js';
import { userPool } from '../lib/cognito';

interface User {
  email: string;
  sub: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  needsNewPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  completeNewPassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [tempCognitoUser, setTempCognitoUser] = useState<CognitoUser | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (!err && session?.isValid()) {
          const idToken = session.getIdToken();
          setUser({
            email: idToken.payload.email as string,
            sub: idToken.payload.sub as string,
          });
          setIsAuthenticated(true);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const cognitoUser = new CognitoUser({
        Username: email,
        Pool: userPool,
      });

      const authDetails = new AuthenticationDetails({
        Username: email,
        Password: password,
      });

      const callbacks: IAuthenticationCallback = {
        onSuccess: (session) => {
          const idToken = session.getIdToken();
          setUser({
            email: idToken.payload.email as string,
            sub: idToken.payload.sub as string,
          });
          setIsAuthenticated(true);
          setNeedsNewPassword(false);
          setTempCognitoUser(null);
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
        newPasswordRequired: () => {
          // User needs to set a new password (first login after admin creates user)
          setNeedsNewPassword(true);
          setTempCognitoUser(cognitoUser);
          resolve(); // Resolve so the login form can show the new password form
        },
      };

      cognitoUser.authenticateUser(authDetails, callbacks);
    });
  }, []);

  const completeNewPassword = useCallback(async (newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!tempCognitoUser) {
        reject(new Error('No pending password challenge'));
        return;
      }

      tempCognitoUser.completeNewPasswordChallenge(newPassword, {}, {
        onSuccess: (session) => {
          const idToken = session.getIdToken();
          setUser({
            email: idToken.payload.email as string,
            sub: idToken.payload.sub as string,
          });
          setIsAuthenticated(true);
          setNeedsNewPassword(false);
          setTempCognitoUser(null);
          resolve();
        },
        onFailure: (err) => {
          reject(err);
        },
      });
    });
  }, [tempCognitoUser]);

  const signOut = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      const cognitoUser = userPool.getCurrentUser();
      if (cognitoUser) {
        cognitoUser.globalSignOut({
          onSuccess: () => {
            setIsAuthenticated(false);
            setUser(null);
            resolve();
          },
          onFailure: () => {
            // Even if global sign out fails, clear local state
            cognitoUser.signOut();
            setIsAuthenticated(false);
            setUser(null);
            resolve();
          },
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
        resolve();
      }
    });
  }, []);

  const getAccessToken = useCallback(async (): Promise<string> => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      throw new Error('Not authenticated');
    }

    return new Promise((resolve, reject) => {
      cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
        if (err || !session?.isValid()) {
          setIsAuthenticated(false);
          setUser(null);
          reject(new Error('Invalid session'));
        } else {
          resolve(session.getAccessToken().getJwtToken());
        }
      });
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        needsNewPassword,
        signIn,
        completeNewPassword,
        signOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
