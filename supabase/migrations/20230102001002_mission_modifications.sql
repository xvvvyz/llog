create policy "Team members & subject managers can select." on "public"."routines" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from missions m
      where (m.id = routines.mission_id))));

create policy "Team members can insert." on "public"."routines" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select m.team_id
        from missions m
        where (m.id = routines.mission_id))))));

create policy "Team members can update." on "public"."routines" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select m.team_id
        from missions m
        where (m.id = routines.mission_id))))))
      with check ((exists (
        select 1
        from team_members tm
        where (tm.team_id = (
          select m.team_id
          from missions m
          where (m.id = routines.mission_id))))));

alter table "public"."routines"
  add constraint routines_mission_id_order_unique_constraint unique (mission_id, "order");
