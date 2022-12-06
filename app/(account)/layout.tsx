import { ReactNode } from 'react';
import SignOutButton from '/app/(account)/components/sign-out-button';

const AccountLayout = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-6 py-12 px-6">
    {children}
    <SignOutButton />
  </main>
);

export default AccountLayout;
