import { getUi } from '@/features/account/queries/get-ui';

export const getActiveTeamId = async () => {
  const ui = await getUi();
  return ui?.team?.id;
};
