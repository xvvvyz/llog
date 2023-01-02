create policy "Team members & subject managers can select."
  on "public"."routines"
  as permissive
  for select
  to authenticated
  using ((EXISTS ( SELECT 1
     FROM missions m
    WHERE (m.id = routines.mission_id))));

create policy "Team members can insert."
  on "public"."routines"
  as permissive
  for insert
  to authenticated
  with check ((EXISTS ( SELECT 1
     FROM team_members tm
    WHERE (tm.team_id = ( SELECT m.team_id
             FROM missions m
            WHERE (m.id = routines.mission_id))))));

create policy "Team members can update."
  on "public"."routines"
  as permissive
  for update
  to authenticated
  using ((EXISTS ( SELECT 1
     FROM team_members tm
    WHERE (tm.team_id = ( SELECT m.team_id
             FROM missions m
            WHERE (m.id = routines.mission_id))))))
  with check ((EXISTS ( SELECT 1
     FROM team_members tm
    WHERE (tm.team_id = ( SELECT m.team_id
             FROM missions m
            WHERE (m.id = routines.mission_id))))));

alter table "public"."routines" add constraint routines_mission_id_order_unique_constraint unique (mission_id, "order");
