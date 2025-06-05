import { getUi } from './get-ui';

export const getActiveTeamId = async () => {
  const ui = await getUi();
  return ui?.team?.id;
};
