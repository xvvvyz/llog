import createServerSupabaseClient from '@/_utilities/create-server-supabase-client';

const getMissionWithSessionsAndEvents = (
  missionId: string,
  { draft } = { draft: false },
) =>
  createServerSupabaseClient()
    .from('missions')
    .select(
      `
      id,
      name,
      sessions(
        draft,
        id,
        modules:event_types(
          event:events(id),
          id
        ),
        order,
        scheduled_for,
        title
      )`,
    )
    .eq('id', missionId)
    .order('order', { referencedTable: 'sessions' })
    .not('sessions.draft', 'is', draft ? null : true)
    .order('draft', { ascending: false, referencedTable: 'sessions' })
    .eq('sessions.modules.archived', false)
    .single();

export type GetMissionWithSessionsAndEventsData = Awaited<
  ReturnType<typeof getMissionWithSessionsAndEvents>
>['data'];

export default getMissionWithSessionsAndEvents;
