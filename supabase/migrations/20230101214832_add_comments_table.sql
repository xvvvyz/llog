create table "public"."comments" (
  "id" uuid not null default uuid_generate_v4 (),
  "created_at" timestamp with time zone not null default now(),
  "text" text not null default ''::text,
  "files" text[],
  "event_id" uuid not null,
  "profile_id" uuid not null
);

alter table "public"."comments" enable row level security;

create index comments_event_id_index on public.comments using btree (event_id);

create unique index comments_pkey on public.comments using btree (id);

alter table "public"."comments"
  add constraint "comments_pkey" primary key using index "comments_pkey";

alter table "public"."comments"
  add constraint "comments_event_id_fkey" foreign key (event_id) references events (id) not valid;

alter table "public"."comments" validate constraint "comments_event_id_fkey";

alter table "public"."comments"
  add constraint "comments_profile_id_fkey" foreign key (profile_id) references profiles (id) not valid;

alter table "public"."comments" validate constraint "comments_profile_id_fkey";

create policy "Team members & subject managers can insert." on "public"."comments" as permissive
  for insert to public
    with check (true);

create policy "Team members & subject managers can select." on "public"."comments" as permissive
  for select to authenticated
    using ((exists (
      select 1
      from events e
      where (e.id = comments.event_id))));
