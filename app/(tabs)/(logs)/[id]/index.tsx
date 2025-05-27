import { LogDropdownMenu } from '@/components/log-dropdown-menu';
import { LogDropdownMenuForms } from '@/components/log-dropdown-menu-forms';
import { Title } from '@/components/ui/title';
import { useActiveTeamId } from '@/hooks/use-active-team-id';
import { useHeaderHeight } from '@/hooks/use-header-height';
import { useLogDropdownMenuForms } from '@/hooks/use-log-dropdown-menu-forms';
import { db } from '@/utilities/db';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Fragment, useEffect } from 'react';

export default function Index() {
  const dropdownMenuForms = useLogDropdownMenuForms();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string }>();
  const { teamId } = useActiveTeamId();

  const { data } = db.useQuery(
    teamId ? { logs: { $: { where: { id: params.id } } } } : null
  );

  const log = data?.logs?.[0];

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Fragment>
          <LogDropdownMenu
            headerHeight={headerHeight}
            logId={log?.id}
            logName={log?.name}
            setLogDeleteFormId={dropdownMenuForms.setLogDeleteFormId}
            setLogEditFormId={dropdownMenuForms.setLogEditFormId}
            setLogTagsFromId={dropdownMenuForms.setLogTagsFromId}
            variant="header"
          />
          <LogDropdownMenuForms {...dropdownMenuForms} />
        </Fragment>
      ),
      headerTitle: () => <Title>{log?.name}</Title>,
    });
  }, [dropdownMenuForms, headerHeight, log, navigation, params.id]);

  if (!log) {
    return null;
  }

  return null;
}
