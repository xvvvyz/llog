import { db } from '@/lib/utils';
import { User } from '@instantdb/react';
import * as React from 'react';

interface AuthContextType {
  error: { message: string } | null;
  isLoading: boolean;
  sendMagicCode: (email: string) => Promise<void>;
  signInWithMagicCode: (email: string, code: string) => Promise<void>;
  signOut: () => void;
  user: User | null;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = React.useState(false);
  const { isLoading, user, error } = db.useAuth();

  const sendMagicCode = async (email: string) => {
    setPending(true);

    try {
      await db.auth.sendMagicCode({ email });
    } finally {
      setPending(false);
    }
  };

  const signInWithMagicCode = async (email: string, code: string) => {
    setPending(true);

    try {
      await db.auth.signInWithMagicCode({ code, email });
    } finally {
      setPending(false);
    }
  };

  const signOut = () => db.auth.signOut();

  return (
    <AuthContext.Provider
      value={{
        error: error ?? null,
        isLoading: isLoading || pending,
        sendMagicCode,
        signInWithMagicCode,
        signOut,
        user: user ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
