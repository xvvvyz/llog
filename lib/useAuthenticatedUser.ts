import { useAuth } from '@/lib/auth';

export function useAuthenticatedUser() {
  const auth = useAuth();
  return auth.user!;
}
