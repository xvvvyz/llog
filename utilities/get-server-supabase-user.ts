import createServerSupabaseClient from '/utilities/create-server-supabase-client';

const getServerSupabaseUser = async () => {
  const res = await createServerSupabaseClient().auth.getUser();
  return res?.data?.user;
};

export default getServerSupabaseUser;
