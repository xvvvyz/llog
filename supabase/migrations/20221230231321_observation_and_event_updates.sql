alter table "public"."event_inputs"
  drop constraint "event_inputs_input_id_fkey";

alter table "public"."events"
  drop constraint "events_profile_id_fkey";

alter table "public"."event_inputs"
  drop constraint "event_inputs_pkey";

drop index if exists "public"."event_inputs_pkey";

alter table "public"."event_inputs"
  drop column "input_id";

alter table "public"."events"
  drop column "profile_id";

alter table "public"."events"
  add column "subject_id" uuid not null;

create unique index event_inputs_pkey on public.event_inputs using btree (event_id, input_option_id);

alter table "public"."event_inputs"
  add constraint "event_inputs_pkey" primary key using index "event_inputs_pkey";

alter table "public"."events"
  add constraint "events_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."events" validate constraint "events_subject_id_fkey";

set check_function_bodies = off;

create or replace function public.upsert_observation_event (event events, event_input_option_ids uuid[], OUT id uuid)
  returns uuid
  language plpgsql
  as $$
  begin
    if event.id is null then
      insert into events as e (subject_id, observation_id)
        values (event.subject_id, event.observation_id)
      returning
        e.id into event.id;
    else
      delete from event_inputs as ei
      where ei.event_id = event.id;
    end if;
    insert into event_inputs (event_id, input_option_id)
      values (event.id, unnest(event_input_option_ids));
    id = event.id;
  end
  $$;

create policy "Team members & subject managers can delete." on "public"."event_inputs" as permissive
  for delete to authenticated using (true);

create policy "Team members & subject managers can insert." on "public"."event_inputs" as permissive
  for insert to authenticated with check (true);

create policy "Team members & subject managers can insert." on "public"."events" as permissive
  for insert to authenticated with check (true);

create policy "Team members & subject managers can select." on "public"."event_inputs" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from events e
      where (event_inputs.event_id = e.id))));

  create policy "Team members & subject managers can select." on "public"."events" as permissive
    for select to authenticated
      using ((exists (
        select 1
        from subjects s
        where (events.subject_id = s.id))));
