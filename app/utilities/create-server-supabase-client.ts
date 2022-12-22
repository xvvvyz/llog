import { createServerComponentSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies, headers } from 'next/headers';
import { Database } from 'types/database';

const createServerSupabaseClient = () =>
  createServerComponentSupabaseClient<Database>({ cookies, headers });

export default createServerSupabaseClient;
