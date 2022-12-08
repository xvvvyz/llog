drop policy "Public profiles are viewable by everyone." on "public"."profiles";

create table "public"."subjects" (
    "id" uuid not null default uuid_generate_v4(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "name" text not null
        check (length("name") > 0)
        check (length("name") < 50),
    "owner" uuid not null default auth.uid()
);


alter table "public"."subjects" enable row level security;

CREATE UNIQUE INDEX subjects_pkey ON public.subjects USING btree (id);

alter table "public"."subjects" add constraint "subjects_pkey" PRIMARY KEY using index "subjects_pkey";

alter table "public"."subjects" add constraint "subjects_owner_fkey" FOREIGN KEY (owner) REFERENCES auth.users(id) not valid;

alter table "public"."subjects" validate constraint "subjects_owner_fkey";

create policy "Subjects are viewable and editable by their owner."
on "public"."subjects"
as permissive
for all
to authenticated
using ((auth.uid() = owner));


create policy "Public profiles are viewable by everyone."
on "public"."profiles"
as permissive
for select
to authenticated
using (true);



