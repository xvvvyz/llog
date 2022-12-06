import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '/supabase/types';

const supabase = createBrowserSupabaseClient<Database>();

export default supabase;
