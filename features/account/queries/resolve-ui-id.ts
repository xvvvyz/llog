import { getUi } from '@/features/account/queries/get-ui';

export const resolveUiId = async (uiId?: string) => {
  if (uiId) return uiId;
  const ui = await getUi();
  return ui?.id;
};
