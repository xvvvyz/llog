import { ReactNode } from 'react';

const AuthLayout = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-9 py-12 px-6">
    {children}
  </main>
);

export default AuthLayout;
