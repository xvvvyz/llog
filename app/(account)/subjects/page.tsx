import getServerSupabaseUser from '/utilities/get-server-supabase-user';

const SubjectsPage = async () => {
  const user = await getServerSupabaseUser();
  return <span>Logged in: {user?.email}</span>;
};

export default SubjectsPage;
