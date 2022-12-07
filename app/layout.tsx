import { ReactNode } from 'react';
import AuthListener from '/components/auth-listener';
import createServerSupabaseClient from '/utilities/create-server-supabase-client';

import '../globals.css';

const AppLayout = async ({ children }: { children: ReactNode }) => {
  const supabase = createServerSupabaseClient();
  const res = await supabase.auth.getSession();

  return (
    <html lang="en">
      <AuthListener accessToken={res?.data?.session?.access_token} />
      <body>{children}</body>
    </html>
  );
};

export const revalidate = 0;
export default AppLayout;
