create table "public"."profiles" (
  "id" uuid not null,
  "first_name" text not null,
  "last_name" text not null
);

alter table "public"."profiles" enable row level security;

create table "public"."subject_managers" (
  "profile_id" uuid not null,
  "subject_id" uuid not null
);

alter table "public"."subject_managers" enable row level security;

create table "public"."subjects" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "name" text not null,
  "image_uri" text
);

alter table "public"."subjects" enable row level security;

create unique index profiles_pkey on public.profiles using btree (id);

create unique index subject_managers_pkey on public.subject_managers using btree (profile_id, subject_id);

create unique index subjects_pkey on public.subjects using btree (id);

alter table "public"."profiles"
  add constraint "profiles_pkey" primary key using index "profiles_pkey";

alter table "public"."subject_managers"
  add constraint "subject_managers_pkey" primary key using index "subject_managers_pkey";

alter table "public"."subjects"
  add constraint "subjects_pkey" primary key using index "subjects_pkey";

alter table "public"."profiles"
  add constraint "profiles_first_name_check" check ((length(first_name) > 0)) not valid;

alter table "public"."profiles" validate constraint "profiles_first_name_check";

alter table "public"."profiles"
  add constraint "profiles_first_name_check1" check ((length(first_name) < 50)) not valid;

alter table "public"."profiles" validate constraint "profiles_first_name_check1";

alter table "public"."profiles"
  add constraint "profiles_id_fkey" foreign key (id) references auth.users (id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles"
  add constraint "profiles_last_name_check" check ((length(last_name) > 0)) not valid;

alter table "public"."profiles" validate constraint "profiles_last_name_check";

alter table "public"."profiles"
  add constraint "profiles_last_name_check1" check ((length(last_name) < 50)) not valid;

alter table "public"."profiles" validate constraint "profiles_last_name_check1";

alter table "public"."subject_managers"
  add constraint "subject_managers_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."subject_managers" validate constraint "subject_managers_profile_id_fkey";

alter table "public"."subject_managers"
  add constraint "subject_managers_subject_id_fkey" foreign key (subject_id) references subjects (id) not valid;

alter table "public"."subject_managers" validate constraint "subject_managers_subject_id_fkey";

alter table "public"."subjects"
  add constraint "subjects_image_uri_check" check ((length(image_uri) < 100)) not valid;

alter table "public"."subjects" validate constraint "subjects_image_uri_check";

alter table "public"."subjects"
  add constraint "subjects_name_check" check ((length(name) > 0)) not valid;

alter table "public"."subjects" validate constraint "subjects_name_check";

alter table "public"."subjects"
  add constraint "subjects_name_check1" check ((length(name) < 50)) not valid;

alter table "public"."subjects" validate constraint "subjects_name_check1";

set check_function_bodies = off;

insert into storage.buckets (id, name, public)
  values ('subjects', 'subjects', true);

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

create trigger on_insert_or_update_object
  after insert or update on storage.objects
  for each row
  execute function public.handle_insert_or_update_object ();

create or replace function public.handle_insert_subject ()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $$
  begin
    insert into public.subject_managers (subject_id, profile_id)
      values (new.id, auth.uid ());
    return new;
  end;
  $$;

create trigger on_insert_subject
  after insert on public.subjects
  for each row
  execute function handle_insert_subject ();

create or replace function public.handle_insert_user ()
  returns trigger
  language plpgsql
  security definer
  set search_path to 'public'
  as $$
  begin
    insert into public.profiles (id, first_name, last_name)
      values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
    return new;
  end;
  $$;

create trigger on_insert_user
  after insert on auth.users
  for each row
  execute function public.handle_insert_user ();

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

create trigger on_update_user
  after insert on auth.users
  for each row
  execute function public.handle_update_user ();

create policy "Auth users can select." on "public"."profiles" as permissive
  for select to authenticated
    using (true);

create policy "Auth users can select." on "public"."subject_managers" as permissive
  for select to authenticated
    using (true);

create policy "Auth users can insert." on "public"."subjects" as permissive
  for insert to authenticated
    with check (true);

create policy "Subject managers can select." on "public"."subjects" as permissive
  for select to authenticated
    using (((exists (
      select 1
      from subject_managers sm
      where ((sm.profile_id = auth.uid ()) and (sm.subject_id = subjects.id)))) or (not (exists (
        select 1
        from subject_managers
        where (subject_managers.subject_id = subjects.id))))));

create policy "Subject managers can update." on "public"."subjects" as permissive
  for update to authenticated
    using ((exists (
      select 1
      from subject_managers sm
      where ((sm.profile_id = auth.uid ()) and (sm.subject_id = subjects.id)))))
    with check ((exists (
      select 1
      from subject_managers sm
      where ((sm.profile_id = auth.uid ()) and (sm.subject_id = subjects.id)))));

create policy "Subject managers can select." on storage.objects
  for select to authenticated
    using (bucket_id = 'subjects'
      and (exists (
        select 1
        from subject_managers sm
        where sm.profile_id = auth.uid () and sm.subject_id::text = (storage.foldername (name))[1])));

create policy "Subject managers can insert." on storage.objects
  for insert to authenticated
    with check (bucket_id = 'subjects'
    and (exists (
      select 1
      from subject_managers sm
      where sm.profile_id = auth.uid () and sm.subject_id::text = (storage.foldername (name))[1])));

create policy "Subject managers can update." on storage.objects
  for update to authenticated
    using (bucket_id = 'subjects'
      and (exists (
        select 1
        from subject_managers sm
        where sm.profile_id = auth.uid () and sm.subject_id::text = (storage.foldername (name))[1])))
        with check (bucket_id = 'subjects'
        and (exists (
          select 1
          from subject_managers sm
          where sm.profile_id = auth.uid () and sm.subject_id::text = (storage.foldername (name))[1])));
