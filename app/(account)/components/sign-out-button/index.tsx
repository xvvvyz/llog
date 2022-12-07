'use client';

import supabase from '/utilities/browser-supabase-client';

const SignOutButton = () => <button onClick={() => supabase.auth.signOut()}>Sign out</button>;

export default SignOutButton;
