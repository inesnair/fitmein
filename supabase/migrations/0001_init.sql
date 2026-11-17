-- FitMeIn : schéma initial. Chaque table est privée à son utilisateur (RLS).

create type offer_status as enum ('analyse', 'nomatch', 'todo', 'progress', 'ok', 'ko');
create type milestone_type as enum ('entretien_rh', 'entretien_manager', 'test_technique', 'cas_pratique', 'entretien_final', 'proposition', 'autre');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  target_title text,
  location text,
  contract text,
  cv_text text,
  cv_file_name text,
  updated_at timestamptz not null default now()
);

create table user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  domain text not null,
  name text not null,
  level smallint not null check (level between 1 and 4),
  years numeric(4,1),
  last_used date,
  created_at timestamptz not null default now(),
  unique (user_id, domain, name)
);

create table offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  source text not null default 'text',
  url text,
  url_key text,
  text_hash text not null,
  raw_text text not null,
  title text not null,
  company text not null default '',
  location text not null default '',
  contract text not null default '',
  seniority text not null default '',
  analysis jsonb,
  match jsonb,
  score smallint,
  summary text,
  status offer_status not null default 'analyse',
  applied_at date,
  channel text,
  notes text,
  outcome_date date,          -- date du retour employeur (OK ou KO)
  outcome_stage text,         -- étape atteinte
  outcome_reason text,        -- motif du refus
  outcome_comment text,
  start_date date,            -- si OK
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index offers_user_status on offers (user_id, status);
create index offers_user_hash on offers (user_id, text_hash);
create index offers_user_url on offers (user_id, url_key);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  offer_id uuid not null references offers on delete cascade,
  type milestone_type not null,
  starts_at timestamptz not null,
  duration_min smallint default 60,
  mode text check (mode in ('visio', 'presentiel', 'telephone')),
  location_or_link text,
  contact_name text,
  contact_role text,
  contact_email text,
  prep_notes text,
  debrief text,
  created_at timestamptz not null default now()
);
create index milestones_user_date on milestones (user_id, starts_at);

create table generated_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  offer_id uuid references offers on delete set null,
  kind text not null check (kind in ('cv', 'lettre')),
  file_name text not null,
  storage_path text not null,
  content jsonb not null,
  removed_items jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- RLS : un utilisateur ne voit et ne modifie que ses lignes
alter table profiles enable row level security;
alter table user_skills enable row level security;
alter table offers enable row level security;
alter table milestones enable row level security;
alter table generated_documents enable row level security;

create policy "own profile" on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own skills" on user_skills for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own offers" on offers for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own milestones" on milestones for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own documents" on generated_documents for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Stockage des CV générés : dossier = id de l'utilisateur
insert into storage.buckets (id, name, public) values ('documents', 'documents', false) on conflict do nothing;
create policy "own files read" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files write" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- Profil créé automatiquement à l'inscription
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger offers_touch before update on offers for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on profiles for each row execute function public.touch_updated_at();
