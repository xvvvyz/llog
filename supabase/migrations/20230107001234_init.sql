create table "public"."comments" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "text" text not null default ''::text,
  "files" text[],
  "event_id" uuid not null,
  "profile_id" uuid not null,
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text)
);

alter table "public"."comments" enable row level security;

create table "public"."event_inputs" (
  "event_id" uuid not null,
  "input_option_id" uuid not null,
  "id" uuid not null default uuid_generate_v4 (),
  "input_id" uuid not null,
  "value" jsonb
);

alter table "public"."event_inputs" enable row level security;

create table "public"."events" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default now(),
  "routine_id" uuid,
  "observation_id" uuid,
  "subject_id" uuid not null,
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text)
);

alter table "public"."events" enable row level security;

create table "public"."input_options" (
  "id" uuid not null default uuid_generate_v4 (),
  "input_id" uuid not null,
  "label" text not null,
  "order" smallint not null
);

alter table "public"."input_options" enable row level security;

create table "public"."input_types" (
  "id" text not null,
  "label" text not null
);

alter table "public"."input_types" enable row level security;

create table "public"."inputs" (
  "id" uuid not null default uuid_generate_v4 (),
  "team_id" uuid not null default auth.uid (),
  "label" text not null,
  "type" text not null,
  "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text)
);

alter table "public"."inputs" enable row level security;

create table "public"."missions" (
  "id" uuid not null default uuid_generate_v4 (),
  "name" text not null,
  "subject_id" uuid not null,
  "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text)
);

alter table "public"."missions" enable row level security;

create table "public"."observation_inputs" (
  "observation_id" uuid not null,
  "input_id" uuid not null,
  "order" smallint not null
);

alter table "public"."observation_inputs" enable row level security;

create table "public"."observations" (
  "id" uuid not null default uuid_generate_v4 (),
  "name" text not null,
  "description" text not null default ''::text,
  "team_id" uuid not null default auth.uid (),
  "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text)
);

alter table "public"."observations" enable row level security;

create table "public"."profiles" (
  "id" uuid not null,
  "first_name" text not null,
  "last_name" text not null
);

alter table "public"."profiles" enable row level security;

create table "public"."routine_inputs" (
  "routine_id" uuid not null,
  "input_id" uuid not null,
  "order" smallint not null
);

alter table "public"."routine_inputs" enable row level security;

create table "public"."routines" (
  "id" uuid not null default uuid_generate_v4 (),
  "mission_id" uuid not null,
  "name" text not null,
  "content" text not null default ''::text,
  "session" smallint not null,
  "order" smallint not null
);

alter table "public"."routines" enable row level security;

create table "public"."subject_managers" (
  "profile_id" uuid not null,
  "subject_id" uuid not null
);

alter table "public"."subject_managers" enable row level security;

create table "public"."subject_observations" (
  "subject_id" uuid not null,
  "observation_id" uuid not null,
  "order" smallint not null
);

alter table "public"."subject_observations" enable row level security;

create table "public"."subjects" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "updated_at" timestamp with time zone not null default (now() AT TIME ZONE 'utc'::text),
  "name" text not null,
  "image_uri" text,
  "team_id" uuid not null default auth.uid ()
);

alter table "public"."subjects" enable row level security;

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

create index comments_event_id_created_at_index on public.comments using btree (event_id, created_at);
create index event_inputs_event_id_index on public.event_inputs using btree (event_id);
create index event_inputs_input_id_index on public.event_inputs using btree (input_id);
create index event_inputs_input_option_id_index on public.event_inputs using btree (input_option_id);
create index events_subject_id_created_at_index on public.events using btree (subject_id, created_at);
create index inputs_team_id_updated_at_index on public.inputs using btree (team_id, updated_at);
create index missions_team_id_subject_id_updated_at_index on public.missions using btree (subject_id, updated_at);
create index observations_team_id_updated_at_index on public.observations using btree (team_id, updated_at);
create index routines_mission_id_session_index on public.routines using btree (mission_id, session);
create index subject_managers_profile_id_index on public.subject_managers using btree (profile_id);
create index subject_managers_subject_id_index on public.subject_managers using btree (subject_id);
create index subjects_team_id_updated_at_index on public.subjects using btree (team_id, updated_at);
create index team_members_profile_id_index on public.team_members using btree (profile_id);
create index team_members_team_id_index on public.team_members using btree (team_id);
create unique index comments_pkey on public.comments using btree (id);
create unique index event_inputs_pkey on public.event_inputs using btree (id);
create unique index events_pkey on public.events using btree (id);
create unique index input_options_input_id_order_unique_index on public.input_options using btree (input_id, "order");
create unique index input_options_pkey on public.input_options using btree (id);
create unique index input_types_pkey on public.input_types using btree (id);
create unique index inputs_pkey on public.inputs using btree (id);
create unique index missions_pkey on public.missions using btree (id);
create unique index observation_inputs_observation_id_order_unique_index on public.observation_inputs using btree (observation_id, "order");
create unique index observation_inputs_pkey on public.observation_inputs using btree (observation_id, input_id);
create unique index observations_pkey on public.observations using btree (id);
create unique index profiles_pkey on public.profiles using btree (id);
create unique index routine_inputs_pkey on public.routine_inputs using btree (routine_id, input_id);
create unique index routine_inputs_routine_id_order_unique_index on public.routine_inputs using btree (routine_id, "order");
create unique index routine_pkey on public.routines using btree (id);
create unique index routines_mission_id_order_unique_index on public.routines using btree (mission_id, "order");
create unique index subject_managers_pkey on public.subject_managers using btree (profile_id, subject_id);
create unique index subject_observations_pkey on public.subject_observations using btree (subject_id, observation_id);
create unique index subject_observations_subject_id_order_unique_index on public.subject_observations using btree (subject_id, "order");
create unique index subjects_pkey on public.subjects using btree (id);
create unique index team_members_pkey on public.team_members using btree (team_id, profile_id);
create unique index team_pkey on public.teams using btree (id);

alter table "public"."comments"
  add constraint "comments_pkey" primary key using index "comments_pkey";

alter table "public"."event_inputs"
  add constraint "event_inputs_pkey" primary key using index "event_inputs_pkey";

alter table "public"."events"
  add constraint "events_pkey" primary key using index "events_pkey";

alter table "public"."input_options"
  add constraint "input_options_pkey" primary key using index "input_options_pkey";

alter table "public"."input_types"
  add constraint "input_types_pkey" primary key using index "input_types_pkey";

alter table "public"."inputs"
  add constraint "inputs_pkey" primary key using index "inputs_pkey";

alter table "public"."missions"
  add constraint "missions_pkey" primary key using index "missions_pkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_pkey" primary key using index "observation_inputs_pkey";

alter table "public"."observations"
  add constraint "observations_pkey" primary key using index "observations_pkey";

alter table "public"."profiles"
  add constraint "profiles_pkey" primary key using index "profiles_pkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_pkey" primary key using index "routine_inputs_pkey";

alter table "public"."routines"
  add constraint "routine_pkey" primary key using index "routine_pkey";

alter table "public"."subject_managers"
  add constraint "subject_managers_pkey" primary key using index "subject_managers_pkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_pkey" primary key using index "subject_observations_pkey";

alter table "public"."subjects"
  add constraint "subjects_pkey" primary key using index "subjects_pkey";

alter table "public"."team_members"
  add constraint "team_members_pkey" primary key using index "team_members_pkey";

alter table "public"."teams"
  add constraint "team_pkey" primary key using index "team_pkey";

alter table "public"."comments"
  add constraint "comments_event_id_fkey" foreign key (event_id) references events (id) not valid;

alter table "public"."comments" validate constraint "comments_event_id_fkey";

alter table "public"."comments"
  add constraint "comments_text_length" check ((length(text) < 5000)) not valid;

alter table "public"."comments" validate constraint "comments_text_length";

alter table "public"."comments"
  add constraint "comments_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."comments" validate constraint "comments_profile_id_fkey";

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
  add constraint "events_routine_id_fkey" foreign key (routine_id) references routines (id) not valid;

alter table "public"."events" validate constraint "events_routine_id_fkey";

alter table "public"."events"
  add constraint "events_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."events" validate constraint "events_subject_id_fkey";

alter table "public"."input_options"
  add constraint "input_options_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."input_options" validate constraint "input_options_input_id_fkey";

alter table "public"."input_options"
  add constraint "input_options_input_id_order_unique_constraint" unique using index "input_options_input_id_order_unique_index";

alter table "public"."input_options"
  add constraint "input_options_label_length" check (((length(label) > 0) and (length(label) < 50))) not valid;

alter table "public"."input_options" validate constraint "input_options_label_length";

alter table "public"."inputs"
  add constraint "inputs_label_length" check (((length(label) > 0) and (length(label) < 50))) not valid;

alter table "public"."inputs" validate constraint "inputs_label_length";

alter table "public"."inputs"
  add constraint "inputs_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."inputs" validate constraint "inputs_team_id_fkey";

alter table "public"."inputs"
  add constraint "inputs_type_fkey" foreign key (type) references input_types (id) not valid;

alter table "public"."inputs" validate constraint "inputs_type_fkey";

alter table "public"."missions"
  add constraint "missions_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."missions" validate constraint "missions_name_length";

alter table "public"."missions"
  add constraint "missions_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."missions" validate constraint "missions_subject_id_fkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."observation_inputs" validate constraint "observation_inputs_input_id_fkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_observation_id_fkey" foreign key (observation_id) references observations (id) not valid;

alter table "public"."observation_inputs" validate constraint "observation_inputs_observation_id_fkey";

alter table "public"."observation_inputs"
  add constraint "observation_inputs_observation_id_order_unique_constraint" unique using index "observation_inputs_observation_id_order_unique_index";

alter table "public"."observations"
  add constraint "observations_description_length" check ((length(description) < 500)) not valid;

alter table "public"."observations" validate constraint "observations_description_length";

alter table "public"."observations"
  add constraint "observations_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."observations" validate constraint "observations_name_length";

alter table "public"."observations"
  add constraint "observations_team_id_fkey" foreign key (team_id) references teams (id) not valid;

alter table "public"."observations" validate constraint "observations_team_id_fkey";

alter table "public"."profiles"
  add constraint "profiles_first_name_length" check (((length(first_name) > 0) and (length(first_name) < 50))) not valid;

alter table "public"."profiles" validate constraint "profiles_first_name_length";

alter table "public"."profiles"
  add constraint "profiles_id_fkey" foreign key (id) references auth.users (id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles"
  add constraint "profiles_last_name_length" check (((length(last_name) > 0) and (length(last_name) < 50))) not valid;

alter table "public"."profiles" validate constraint "profiles_last_name_length";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_input_id_fkey" foreign key (input_id) references inputs (id) not valid;

alter table "public"."routine_inputs" validate constraint "routine_inputs_input_id_fkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_routine_id_fkey" foreign key (routine_id) references routines (id) not valid;

alter table "public"."routine_inputs" validate constraint "routine_inputs_routine_id_fkey";

alter table "public"."routine_inputs"
  add constraint "routine_inputs_routine_id_order_unique_constraint" unique using index "routine_inputs_routine_id_order_unique_index";

alter table "public"."routines"
  add constraint "routines_mission_id_fkey" foreign key (mission_id) references missions (id) not valid;

alter table "public"."routines" validate constraint "routines_mission_id_fkey";

alter table "public"."routines"
  add constraint "routines_mission_id_order_unique_constraint" unique using index "routines_mission_id_order_unique_index";

alter table "public"."routines"
  add constraint "routines_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."routines" validate constraint "routines_name_length";

alter table "public"."routines"
  add constraint "routines_content_length" check (((length(content) > 0) and (length(content) < 5000))) not valid;

alter table "public"."routines" validate constraint "routines_content_length";

alter table "public"."subject_managers"
  add constraint "subject_managers_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."subject_managers" validate constraint "subject_managers_profile_id_fkey";

alter table "public"."subject_managers"
  add constraint "subject_managers_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."subject_managers" validate constraint "subject_managers_subject_id_fkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_observation_id_fkey" foreign key (observation_id) references observations (id) not valid;

alter table "public"."subject_observations" validate constraint "subject_observations_observation_id_fkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."subject_observations" validate constraint "subject_observations_subject_id_fkey";

alter table "public"."subject_observations"
  add constraint "subject_observations_subject_id_order_unique_constraint" unique using index "subject_observations_subject_id_order_unique_index";

alter table "public"."subjects"
  add constraint "subjects_image_uri_length" check ((length(image_uri) < 100)) not valid;

alter table "public"."subjects" validate constraint "subjects_image_uri_length";

alter table "public"."subjects"
  add constraint "subjects_name_length" check (((length(name) > 0) and (length(name) < 50))) not valid;

alter table "public"."subjects" validate constraint "subjects_name_length";

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

create or replace function public.handle_insert_or_update_object ()
  returns trigger
  language plpgsql
  set search_path to 'public'
  as $$
begin
  if (split_part(storage.filename (new.name), '.', 1) = 'image') then
    update public.subjects
    set image_uri = new.bucket_id || '/' || new.name || '?c=' || substr(md5(random()::text), 0, 5)
    where id::text = (storage.foldername (new.name))[1];
  end if;
  return new;
end;
$$;

create or replace function public.handle_insert_team ()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $$
begin
  insert into public.team_members (team_id, profile_id)
    values (new.id, new.owner);
  return new;
end;
$$;

create or replace function public.handle_insert_user ()
  returns trigger
  language plpgsql
  security definer
  as $$
begin
  insert into public.profiles (id, first_name, last_name)
    values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
  insert into public.teams (id, name, owner)
    values (new.id, 'Personal', new.id);
  return new;
end;
$$;

create or replace function public.handle_update_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $$
begin
  update public.profiles
  set (first_name, last_name) = (new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
  where id = new.id;
  return new;
end;
$$;

create or replace function public.upsert_observation_event (event events, event_input_option_ids uuid[], OUT id uuid)
  returns uuid
  language plpgsql
  as $$
begin
  if event.id is null then
    insert into events as e (subject_id, observation_id)
      values (event.subject_id, event.observation_id)
    returning e.id into event.id;
  else
    delete from event_inputs as ei
    where ei.event_id = event.id;
  end if;
  insert into event_inputs (event_id, input_option_id)
    values (event.id, unnest(event_input_option_ids));
  id = event.id;
end
$$;

create or replace function public.upsert_observations_with_inputs (input_ids uuid[], observation observations, OUT id uuid)
  returns uuid
  language plpgsql
  as $$
begin
  if observation.id is null then
    insert into observations as o (description, name, team_id)
      values (observation.description, observation.name, auth.uid ())
    returning o.id into observation.id;
  else
    update observations as o
    set description = observation.description, name = observation.name
    where o.id = observation.id;
    delete from observation_inputs as oi
    where oi.observation_id = observation.id;
  end if;
  insert into observation_inputs (observation_id, input_id, "order")
    values (observation.id, unnest(input_ids), generate_series(0, array_length(input_ids, 1) - 1));
  id = observation.id;
end
$$;

create or replace function public.upsert_routine_event (event events, event_input_option_ids uuid[], OUT id uuid)
  returns uuid
  language plpgsql
  as $$
begin
  if event.id is null then
    insert into events as e (subject_id, routine_id)
      values (event.subject_id, event.routine_id)
    returning e.id into event.id;
  else
    delete from event_inputs as ei
    where ei.event_id = event.id;
  end if;
  insert into event_inputs (event_id, input_option_id)
    values (event.id, unnest(event_input_option_ids));
  id = event.id;
end
$$;

create or replace function public.upsert_subject_with_observations (observation_ids uuid[], subject subjects, OUT id uuid)
  returns uuid
  language plpgsql
  as $$
begin
  if subject.id is null then
    insert into subjects as s (name, team_id)
      values (subject.name, auth.uid ())
    returning s.id into subject.id;
  else
    update subjects as s
    set name = subject.name
    where s.id = subject.id;
    delete from subject_observations as so
    where so.subject_id = subject.id;
  end if;
  insert into subject_observations (subject_id, observation_id, "order")
    values (subject.id, unnest(observation_ids), generate_series(0, array_length(observation_ids, 1) - 1));
  id = subject.id;
end
$$;

create trigger on_insert_or_update_object
  after insert or update on storage.objects
  for each row
  execute function handle_insert_or_update_object ();

create trigger on_insert_user
  after insert on auth.users
  for each row
  execute function handle_insert_user ();

create trigger on_update_user
  after insert on auth.users
  for each row
  execute function handle_update_user ();

create trigger on_insert_team
  after insert on public.teams
  for each row
  execute function handle_insert_team ();

create policy "Team members & subject managers can insert." on "public"."comments" as permissive
  for insert to public
    with check (true);

create policy "Team members & subject managers can select." on "public"."comments" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from events e
      where (e.id = comments.event_id))));

create policy "Team members & subject managers can delete." on "public"."event_inputs" as permissive
  for delete to authenticated
    using (true);

create policy "Team members & subject managers can insert." on "public"."event_inputs" as permissive
  for insert to authenticated
    with check (true);

create policy "Team members & subject managers can select." on "public"."event_inputs" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from events e
      where (event_inputs.event_id = e.id))));

create policy "Team members & subject managers can insert." on "public"."events" as permissive
  for insert to authenticated
    with check (true);

create policy "Team members & subject managers can select." on "public"."events" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from subjects s
      where (events.subject_id = s.id))));

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

create policy "Authenticated users can select." on "public"."input_types" as permissive
  for select to authenticated
    using (true);

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
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = missions.subject_id))))) or (exists (
          select 1
          from subject_managers sm
          where (sm.subject_id = missions.subject_id)))));

create policy "Team members can insert." on "public"."missions" as permissive
  for insert to authenticated
    with check ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = missions.subject_id))))));

create policy "Team members can update." on "public"."missions" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = missions.subject_id))))))
      with check ((exists (
        select 1
        from team_members tm
        where (tm.team_id = (
          select s.team_id
          from subjects s
          where (s.id = missions.subject_id))))));

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
        select s.team_id
        from subjects s
        where (s.id = (
          select m.subject_id
          from missions m
          where (m.id = routines.mission_id))))))));

create policy "Team members can update." on "public"."routines" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from team_members tm
      where (tm.team_id = (
        select s.team_id
        from subjects s
        where (s.id = (
          select m.subject_id
          from missions m
          where (m.id = routines.mission_id))))))))
        with check ((exists (
          select 1
          from team_members tm
          where (tm.team_id = (
            select s.team_id
            from subjects s
            where (s.id = (
              select m.subject_id
              from missions m
              where (m.id = routines.mission_id))))))));

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

create policy "Team members & subject managers can insert." on "storage"."objects" as permissive
  for insert to authenticated
    with check ((((bucket_id = 'subjects'::text) and (exists (
      select 1
      from team_members tm
      where ((tm.profile_id = auth.uid ()) and (tm.team_id = (
        select subjects.team_id
        from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid))))))) or (exists (
          select 1
          from subject_managers sm
          where ((sm.profile_id = auth.uid ()) and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));

create policy "Team members & subject managers can select." on "storage"."objects" as permissive
  for select to authenticated
    using ((((bucket_id = 'subjects'::text) and (exists (
      select 1
      from team_members tm
      where ((tm.profile_id = auth.uid ()) and (tm.team_id = (
        select subjects.team_id
        from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid))))))) or (exists (
          select 1
          from subject_managers sm
          where ((sm.profile_id = auth.uid ()) and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));

create policy "Team members & subject managers can update." on "storage"."objects" as permissive
  for update to authenticated
    using ((((bucket_id = 'subjects'::text) and (exists (
      select 1
      from team_members tm
      where ((tm.profile_id = auth.uid ()) and (tm.team_id = (
        select subjects.team_id
        from subjects
        where (subjects.id = ((storage.foldername (objects.name))[1])::uuid))))))) or (exists (
          select 1
          from subject_managers sm
          where ((sm.profile_id = auth.uid ()) and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))))
        with check ((((bucket_id = 'subjects'::text) and (exists (
          select 1
          from team_members tm
          where ((tm.profile_id = auth.uid ()) and (tm.team_id = (
            select subjects.team_id
            from subjects
            where (subjects.id = ((storage.foldername (objects.name))[1])::uuid))))))) or (exists (
              select 1
              from subject_managers sm
              where ((sm.profile_id = auth.uid ()) and (sm.subject_id = ((storage.foldername (objects.name))[1])::uuid))))));

insert into storage.buckets (id, name, public)
  values ('subjects', 'subjects', true);

insert into "public"."input_types" ("id", "label")
  values ('checkbox', 'Checkbox'),
  ('date', 'Date'),
  ('duration', 'Duration'),
  ('multi_select', 'Multi-select'),
  ('number', 'Number'),
  ('select', 'Select');
