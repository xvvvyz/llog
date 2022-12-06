create table public.profiles (
  id uuid references auth.users not null,
  first_name text not null
    check (length(first_name) > 0)
    check (length(first_name) < 50),
  last_name text not null
    check (length(last_name) > 0)
    check (length(last_name) < 50),
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using (true);

create function public.handle_create_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $$
  begin
    insert into public.profiles (id, first_name, last_name)
      values (new.id, new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name');
    return new;
  end;
  $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_create_user();

create function public.handle_update_user()
  returns trigger
  language plpgsql
  security definer set search_path = public
  as $$
  begin
    update public.profiles
      set (first_name, last_name) = (new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data ->> 'last_name')
      where id = new.id;
    return new;
  end;
  $$;

create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_update_user();
