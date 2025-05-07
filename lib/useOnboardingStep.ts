import { db } from '@/lib/utils';

type OnboardingStep = 'create-profile' | 'create-team' | null;

export function useOnboardingStep({ userId }: { userId?: string }) {
  const { data, isLoading } = db.useQuery(
    userId
      ? {
          profiles: {
            $: { where: { 'user.id': userId } },
          },
          roles: {
            $: { where: { 'user.id': userId } },
          },
        }
      : null
  );

  if (isLoading) return { step: null, isLoading: true };

  if (!data?.profiles?.length) {
    return { step: 'create-profile' as OnboardingStep, isLoading: false };
  }

  if (!data?.roles?.length) {
    return { step: 'create-team' as OnboardingStep, isLoading: false };
  }

  return { step: null, isLoading: false };
}
