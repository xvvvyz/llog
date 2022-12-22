drop trigger if exists "on_insert_subject" on "public"."subjects";

drop policy "Auth users can select." on "public"."profiles";

drop policy "Auth users can select." on "public"."subject_managers";

drop policy "Auth users can insert." on "public"."subjects";

drop policy "Subject managers can select." on "public"."subjects";

drop policy "Subject managers can update." on "public"."subjects";

drop function if exists "public"."handle_insert_subject" ();

create table "public"."event_inputs" (
  "event_id" uuid not null,
  "input_id" uuid not null,
  "input_option_id" uuid not null
);

alter table "public"."event_inputs" enable row level security;

create table "public"."events" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default now(),
  "routine_id" uuid,
  "observation_id" uuid,
  "profile_id" uuid not null
);

alter table "public"."events" enable row level security;

create table "public"."input_options" (
  "id" uuid not null default uuid_generate_v4 (),
  "input_id" uuid not null,
  "label" text not null
);

alter table "public"."input_options" enable row level security;

create table "public"."inputs" (
  "id" uuid not null default uuid_generate_v4 (),
  "team_id" uuid not null default auth.uid (),
  "label" text not null,
  "type" text not null
);

alter table "public"."inputs" enable row level security;

create table "public"."missions" (
  "id" uuid not null default uuid_generate_v4 (),
  "name" text not null,
  "subject_id" uuid not null,
  "team_id" uuid not null default auth.uid ()
);

alter table "public"."missions" enable row level security;

create table "public"."observation_inputs" (
  "observation_id" uuid not null,
  "input_id" uuid not null
);

alter table "public"."observation_inputs" enable row level security;

create table "public"."observations" (
  "id" uuid not null default uuid_generate_v4 (),
  "name" text not null,
  "description" text default ''::text,
  "team_id" uuid not null default auth.uid ()
);

alter table "public"."observations" enable row level security;

create table "public"."routine_inputs" (
  "routine_id" uuid not null,
  "input_id" uuid not null
);

alter table "public"."routine_inputs" enable row level security;

create table "public"."routines" (
  "id" uuid not null default uuid_generate_v4 (),
  "mission_id" uuid not null,
  "name" text not null,
  "content" text default ''::text,
  "session" smallint not null default '1' ::smallint,
  "order" smallint not null
);

alter table "public"."routines" enable row level security;

create table "public"."subject_observations" (
  "subject_id" uuid not null,
  "observation_id" uuid not null
);

alter table "public"."subject_observations" enable row level security;

create table "public"."team_members" (
  "team_id" uuid not null default auth.uid (),
  "profile_id" uuid not null
);

alter table "public"."team_members" enable row level security;

create table "public"."teams" (
  "id" uuid not null default uuid_generate_v4 (),
  "name" text not null,
  "owner" uuid not null default auth.uid ()
);

alter table "public"."teams" enable row level security;

alter table "public"."subjects"
  add column "team_id" uuid not null default auth.uid ();

create unique index event_inputs_pkey on public.event_inputs using btree (event_id, input_id);

create unique index events_pkey on public.events using btree (id);

create unique index input_options_pkey on public.input_options using btree (id);

create unique index inputs_pkey on public.inputs using btree (id);

create unique index missions_pkey on public.missions using btree (id);

create unique index observation_inputs_pkey on public.observation_inputs using btree (observation_id, input_id);

create unique index observations_pkey on public.observations using btree (id);

create unique index routine_inputs_pkey on public.routine_inputs using btree (routine_id, input_id);

create unique index routine_pkey on public.routines using btree (id);

create unique index subject_observations_pkey on public.subject_observations using btree (subject_id, observation_id);

create unique index team_members_pkey on public.team_members using btree (team_id, profile_id);

create unique index team_pkey on public.teams using btree (id);

alter table "public"."event_inputs"
  add constraint "event_inputs_pkey" primary key using index "event_inputs_pkey";

alter table "public"."events"
  add constraint "events_pkey" primary key using index "events_pkey";

alter table "public"."input_options"
  add constraint "input_options_pkey" primary key using index "input_options_pkey";

alter table "public"."inputs"
  add constraint "inputs_pkey" primary key using index "inputs_pkey";

alter table "public"."missions"
  add constraint "missions_pkey" primary key using index "missions_pkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_pkey" primary key using index "observation_inputs_pkey";

alter table "public"."observations"
  add constraint "observations_pkey" primary key using index "observations_pkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_pkey" primary key using index "routine_inputs_pkey";

alter table "public"."routines"
  add constraint "routine_pkey" primary key using index "routine_pkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_pkey" primary key using index "subject_observations_pkey";

alter table "public"."team_members"
  add constraint "team_members_pkey" primary key using index "team_members_pkey";

alter table "public"."teams"
  add constraint "team_pkey" primary key using index "team_pkey";

alter table "public"."event_inputs"
  add constraint "event_inputs_event_id_fkey" foreign key (event_id) references events (id) not valid;

alter table "public"."event_inputs" validate constraint "event_inputs_event_id_fkey";

alter table "public"."event_inputs"
  add constraint "event_inputs_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."event_inputs" validate constraint "event_inputs_input_id_fkey";

alter table "public"."event_inputs"
  add constraint "event_inputs_input_option_id_fkey" foreign key (input_option_id) references input_options (id) not valid;

alter table "public"."event_inputs" validate constraint "event_inputs_input_option_id_fkey";

alter table "public"."events"
  add constraint "events_observation_id_fkey" foreign key (observation_id) references observations (id) not valid;

alter table "public"."events" validate constraint "events_observation_id_fkey";

alter table "public"."events"
  add constraint "events_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."events" validate constraint "events_profile_id_fkey";

alter table "public"."events"
  add constraint "events_routine_id_fkey" foreign key (routine_id) references routines (id) not valid;

alter table "public"."events" validate constraint "events_routine_id_fkey";

alter table "public"."input_options"
  add constraint "input_options_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."input_options" validate constraint "input_options_input_id_fkey";

alter table "public"."input_options"
  add constraint "input_options_label_length" check (((length(label) > 0) and (length(label) < 50))) not valid;

alter table "public"."input_options" validate constraint "input_options_label_length";

alter table "public"."inputs"
  add constraint "inputs_label_length" check (((length(label) > 0) and (length(label) < 50))) not valid;

alter table "public"."inputs" validate constraint "inputs_label_length";

alter table "public"."inputs"
  add constraint "inputs_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."inputs" validate constraint "inputs_team_id_fkey";

alter table "public"."missions"
  add constraint "missions_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."missions" validate constraint "missions_name_length";

alter table "public"."missions"
  add constraint "missions_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."missions" validate constraint "missions_subject_id_fkey";

alter table "public"."missions"
  add constraint "missions_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."missions" validate constraint "missions_team_id_fkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."observation_inputs" validate constraint "observation_inputs_input_id_fkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_observation_id_fkey" foreign key (observation_id) references observations (id) not valid;

alter table "public"."observation_inputs" validate constraint "observation_inputs_observation_id_fkey";

alter table "public"."observations"
  add constraint "observations_description_length" check ((length(description) < 500)) not valid;

alter table "public"."observations" validate constraint "observations_description_length";

alter table "public"."observations"
  add constraint "observations_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."observations" validate constraint "observations_name_length";

alter table "public"."observations"
  add constraint "observations_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."observations" validate constraint "observations_team_id_fkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."routine_inputs" validate constraint "routine_inputs_input_id_fkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_routine_id_fkey" foreign key (routine_id) references routines (id) not valid;

alter table "public"."routine_inputs" validate constraint "routine_inputs_routine_id_fkey";

alter table "public"."routines"
  add constraint "routines_content_length" check ((length(content) < 500)) not valid;

alter table "public"."routines" validate constraint "routines_content_length";

alter table "public"."routines"
  add constraint "routines_mission_id_fkey" foreign key (mission_id) references missions (id) not valid;

alter table "public"."routines" validate constraint "routines_mission_id_fkey";

alter table "public"."routines"
  add constraint "routines_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."routines" validate constraint "routines_name_length";

alter table "public"."subject_observations"
  add constraint "subject_observations_observation_id_fkey" foreign key (observation_id) references observations (id) not valid;

alter table "public"."subject_observations" validate constraint "subject_observations_observation_id_fkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."subject_observations" validate constraint "subject_observations_subject_id_fkey";

alter table "public"."subjects"
  add constraint "subjects_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."subjects" validate constraint "subjects_team_id_fkey";

alter table "public"."team_members"
  add constraint "team_members_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."team_members" validate constraint "team_members_profile_id_fkey";

alter table "public"."team_members"
  add constraint "team_members_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."team_members" validate constraint "team_members_team_id_fkey";

alter table "public"."teams"
  add constraint "teams_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."teams" validate constraint "teams_name_length";

alter table "public"."teams"
  add constraint "teams_owner_fkey" foreign key (owner) references profiles (id) not valid;

alter table "public"."teams" validate constraint "teams_owner_fkey";

set check_function_bodies = off;

create or replace function public.handle_insert_team ()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $function$
  begin
    insert into public.team_members (team_id, profile_id)
      values (new.id, new.owner);
    return new;
  end;
  $function$;

create or replace function public.handle_insert_user ()
  returns trigger
  language plpgsql
  security definer
  as $function$
  begin
    insert into public.profiles (id, first_name, last_name)
      values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
    insert into public.teams (id, name, owner)
      values (new.id, 'Personal', new.id);
    return new;
  end;
  $function$;

create policy "Team members & subject managers can select." on "public"."input_options" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from inputs
      where (input_options.input_id = inputs.id))));

create policy "Team members can insert." on "public"."input_options" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select i.team_id
        from inputs i
        where (i.id = input_options.input_id))))));

create policy "Team members can update." on "public"."input_options" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select i.team_id
        from inputs i
        where (i.id = input_options.input_id))))))
      with check ((exists (
        select 1
        from team_members tm
        where (tm.team_id = (
          select i.team_id
          from inputs i
          where (i.id = input_options.input_id))))));

create policy "Team members & subject managers can select." on "public"."inputs" as permissive
  for select to authenticated
    using (((exists (
      select 1
      from team_members tm
      where (tm.team_id = inputs.team_id))) or (exists (
        select 1
        from observation_inputs oi
        where (oi.input_id = inputs.id)))));

create policy "Team members can insert." on "public"."inputs" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = inputs.team_id))));

create policy "Team members can update." on "public"."inputs" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = inputs.team_id))))
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = inputs.team_id))));

create policy "Team members & subject managers can select." on "public"."missions" as permissive
  for select to authenticated
    using (((exists (
      select 1
      from team_members tm
      where (tm.team_id = missions.team_id))) or (exists (
        select 1
        from subject_managers sm
        where (sm.subject_id = missions.subject_id)))));

create policy "Team members can insert." on "public"."missions" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = missions.team_id))));

create policy "Team members can update." on "public"."missions" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = missions.team_id))))
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = missions.team_id))));

create policy "Team members & subject managers can select." on "public"."observation_inputs" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from observations o
      where (o.id = observation_inputs.observation_id))));

create policy "Team members can delete." on "public"."observation_inputs" as permissive
  for delete to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select o.team_id
        from observations o
        where (o.id = observation_inputs.observation_id))))));

create policy "Team members can insert." on "public"."observation_inputs" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select o.team_id
        from observations o
        where (o.id = observation_inputs.observation_id))))));

create policy "Team members & subject managers can select." on "public"."observations" as permissive
  for select to authenticated
    using (((exists (
      select 1
      from team_members tm
      where (tm.team_id = observations.team_id))) or (exists (
        select 1
        from subject_observations so
        where (so.observation_id = observations.id)))));

create policy "Team members can insert." on "public"."observations" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = observations.team_id))));

create policy "Team members can update." on "public"."observations" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = observations.team_id))))
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = observations.team_id))));

create policy "Subject managers can select." on "public"."subject_managers" as permissive
  for select to authenticated
    using ((profile_id = auth.uid ()));

create policy "Team members & subject managers can select." on "public"."subject_observations" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from subjects s
      where (s.id = subject_observations.subject_id))));

create policy "Team members can delete." on "public"."subject_observations" as permissive
  for delete to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = subject_observations.subject_id))))));

create policy "Team members can insert." on "public"."subject_observations" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = subject_observations.subject_id))))));

create policy "Team members & subject managers can select." on "public"."subjects" as permissive
  for select to authenticated
    using (((exists (
      select 1
      from team_members tm
      where (tm.team_id = subjects.team_id))) or (exists (
        select 1
        from subject_managers sm
        where (sm.subject_id = subjects.id)))));

create policy "Team members & subject managers can update." on "public"."subjects" as permissive
  for update to authenticated
    using (((exists (
      select 1
      from team_members tm
      where (tm.team_id = subjects.team_id))) or (exists (
        select 1
        from subject_managers sm
        where (sm.subject_id = subjects.id)))))
      with check (((exists (
        select 1
        from team_members tm
        where (tm.team_id = subjects.team_id))) or (exists (
          select 1
          from subject_managers sm
          where (sm.subject_id = subjects.id)))));

create policy "Team members can insert." on "public"."subjects" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = subjects.team_id))));

create policy "Team members can select." on "public"."team_members" as permissive
  for select to authenticated
    using ((profile_id = auth.uid ()));

create trigger on_insert_team
  after insert on public.teams
  for each row
  execute function handle_insert_team ();

begin;
alter policy "Subject managers can insert." on "storage"."objects" rename to "Team members & subject managers can insert.";
alter policy "Team members & subject managers can insert." on "storage"."objects"
  with check ((((bucket_id = 'subjects'::text)
    and (exists (
      select 1 from team_members tm
      where ((tm.profile_id = auth.uid ())
      and (tm.team_id = (
        select subjects.team_id from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid)))))))
        or (exists (
          select 1 from subject_managers sm
          where ((sm.profile_id = auth.uid ())
          and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));
commit;

begin;
alter policy "Subject managers can select." on "storage"."objects" rename to "Team members & subject managers can select.";
alter policy "Team members & subject managers can select." on "storage"."objects"
  using ((((bucket_id = 'subjects'::text)
    and (exists (
      select 1 from team_members tm
      where ((tm.profile_id = auth.uid ())
      and (tm.team_id = (
        select subjects.team_id from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid)))))))
        or (exists (
          select 1 from subject_managers sm
          where ((sm.profile_id = auth.uid ())
          and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));
commit;

begin;
alter policy "Subject managers can update." on "storage"."objects" rename to "Team members & subject managers can update.";
alter policy "Team members & subject managers can update." on "storage"."objects"
  using ((((bucket_id = 'subjects'::text)
    and (exists (
      select 1 from team_members tm
      where ((tm.profile_id = auth.uid ())
      and (tm.team_id = (
        select subjects.team_id from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid)))))))
        or (exists (
          select 1 from subject_managers sm
          where ((sm.profile_id = auth.uid ())
          and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));
alter policy "Team members & subject managers can update." on "storage"."objects"
  with check ((((bucket_id = 'subjects'::text)
    and (exists (
      select 1 from team_members tm
      where ((tm.profile_id = auth.uid ())
      and (tm.team_id = (
        select subjects.team_id from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid)))))))
        or (exists (
          select 1 from subject_managers sm
          where ((sm.profile_id = auth.uid ())
          and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));
commit;

create or replace function
  public.upsert_subject_with_observations(
    in observation_ids uuid[],
    in subject subjects,
    out id uuid)
  language plpgsql
  as $$
  begin
    if subject.id is null then
      insert into subjects as s (name, team_id)
        values (subject.name, auth.uid())
        returning s.id into subject.id;
    else
      update subjects as s
        set name = subject.name
        where s.id = subject.id;
      delete from subject_observations as so
        where so.subject_id = subject.id;
    end if;
    insert into subject_observations (subject_id, observation_id)
      values(subject.id, unnest(observation_ids));
    id = subject.id;
  end
  $$;
