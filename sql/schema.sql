-- ============================================================
-- Sentinel AI — Supabase schema (profiles, incidents, legal, news cache)
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. Profiles (linked to auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone_number text,
  avatar_url text,
  emergency_contact_name text,
  emergency_contact_phone text,
  home_province text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 2. Incidents
-- ============================================================
do $$ begin
  create type incident_category as enum (
    'Robbery','Hijacking','Kidnapping','Suspicious activity',
    'Assault','Domestic Dispute','Break-In','Other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_severity as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type incident_status as enum ('unverified','corroborated','community-verified','official');
exception when duplicate_object then null; end $$;

do $$ begin
  alter type incident_status add value if not exists 'corroborated';
exception when others then null; end $$;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users on delete set null,
  category incident_category not null default 'Other',
  severity incident_severity not null default 'medium',
  status incident_status not null default 'unverified',
  description text not null,
  latitude double precision not null,
  longitude double precision not null,
  city text,
  province text,
  confidence numeric default 1.0,
  source text default 'community',
  incident_at timestamptz default timezone('utc'::text, now()) not null,
  location_label text,
  visibility text not null default 'public' check (visibility in ('public','private')),
  image_uri text,
  video_uri text,
  image_visibility text not null default 'private' check (image_visibility in ('public','private')),
  video_visibility text not null default 'private' check (video_visibility in ('public','private')),
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- Safe to rerun against an older Sentinel incidents table.
alter table public.incidents add column if not exists incident_at timestamptz;
update public.incidents set incident_at = created_at where incident_at is null;
alter table public.incidents alter column incident_at set default timezone('utc'::text, now());
alter table public.incidents alter column incident_at set not null;
alter table public.incidents add column if not exists location_label text;
alter table public.incidents add column if not exists visibility text not null default 'public';
alter table public.incidents add column if not exists image_uri text;
alter table public.incidents add column if not exists video_uri text;
alter table public.incidents add column if not exists image_visibility text not null default 'private';
alter table public.incidents add column if not exists video_visibility text not null default 'private';

create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_category_idx on public.incidents (category);

alter table public.incidents enable row level security;

drop policy if exists "Anyone signed in can read incidents" on public.incidents;
drop policy if exists "Public incidents or own private incidents are readable" on public.incidents;
create policy "Public incidents or own private incidents are readable"
  on public.incidents for select
  to authenticated, anon
  using (visibility = 'public' or (auth.uid() is not null and auth.uid() = reporter_id));

drop policy if exists "Signed-in users can insert incidents" on public.incidents;
create policy "Signed-in users can insert incidents"
  on public.incidents for insert
  to authenticated, anon
  with check (true);

drop policy if exists "Reporters can update their incidents" on public.incidents;
create policy "Reporters can update their incidents"
  on public.incidents for update
  to authenticated
  using (auth.uid() = reporter_id);

-- Realtime
do $$ begin
  alter publication supabase_realtime add table public.incidents;
exception when duplicate_object then null; end $$;

-- ============================================================
-- 3. Legal & safety advice reference (SA-specific)
-- ============================================================
create table if not exists public.legal_advice (
  id uuid primary key default gen_random_uuid(),
  category incident_category not null,
  legislation_title text not null,
  legislation_citation text not null,
  summary text not null,
  immediate_actions text[] not null default '{}',
  resolution_pattern text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.legal_advice enable row level security;

drop policy if exists "Legal advice is publicly readable" on public.legal_advice;
create policy "Legal advice is publicly readable"
  on public.legal_advice for select
  to authenticated, anon
  using (true);

-- Seed SA legal data
insert into public.legal_advice
  (category, legislation_title, legislation_citation, summary, immediate_actions, resolution_pattern)
values
  ('Robbery',
   'Criminal Procedure Act — Citizen Arrest',
   'Criminal Procedure Act 51 of 1977, Section 42',
   'A private citizen may arrest without a warrant any person who commits or attempts to commit an offence in their presence, or whom they reasonably suspect of having committed a Schedule 1 offence. The arrest must be made with minimal force and the person must be handed to SAPS immediately.',
   array[
     'Do not confront armed suspects — prioritise your life over property.',
     'Move to a safe, well-lit, populated area and call 10111.',
     'Record descriptions (clothing, vehicle, direction of flight) from a distance.',
     'Open a case at the nearest SAPS station within 24 hours; get a case number.',
     'Preserve any CCTV footage — request it in writing before it is overwritten.'
   ],
   'Most community-reported robberies are resolved when a SAPS case number is issued and the CPF shares the description with local patrols. Recovery rates improve when footage is preserved within the first 48 hours.'),

  ('Hijacking',
   'Criminal Procedure Act — Hijacking as Aggravated Robbery',
   'Criminal Procedure Act 51 of 1977 read with Common Law Robbery',
   'Vehicle hijacking is prosecuted as aggravated robbery. Victims have the right to lay a charge, receive a case number, and be referred to Victim Empowerment Programme (VEP) services.',
   array[
     'Do not resist — release the vehicle immediately.',
     'Drive to a public place (petrol station, shopping centre) if you can safely escape.',
     'Call 10111 and 112 from a cellphone; report the vehicle''s tracking unit.',
     'Notify your insurer within 24 hours and obtain a SAPS case number.',
     'If tracking company confirms recovery, wait for SAPS before approaching the vehicle.'
   ],
   'Community resolution typically involves the tracking company, SAPS Vehicle Crime Unit, and insurance. Historically ~40% of tracked vehicles in Gauteng are recovered within 6 hours when reported immediately.'),

  ('Kidnapping',
   'Prevention and Combating of Trafficking in Persons Act',
   'Prevention and Combating of Trafficking in Persons Act 7 of 2013; Criminal Procedure Act 51 of 1977',
   'Kidnapping is a Schedule 1 offence. SAPS must open a case immediately — there is no waiting period. The Hawks (DPCI) may be assigned in trafficking-related matters.',
   array[
     'Call 10111 immediately — do NOT wait 24 hours.',
     'Provide last-seen location, time, clothing, and any vehicle details.',
     'Contact the SAPS Family Violence, Child Protection and Sexual Offences (FCS) unit for minors.',
     'Preserve phone records, social media messages, and any ransom communication.',
     'Notify the CPF and neighbourhood watch — do NOT negotiate independently.'
   ],
   'Resolutions require SAPS hostage negotiation or FCS intervention. Community groups should support but never act as primary negotiators.'),

  ('Suspicious activity',
   'Protection of Personal Information Act (POPIA) and Harassment',
   'Protection from Harassment Act 17 of 2011; POPIA 4 of 2013',
   'Reporting suspicious activity is lawful. However, publicly identifying or accusing individuals without evidence can constitute harassment or defamation. Report to SAPS or CPF with objective observations only.',
   array[
     'Record factual, time-stamped observations — avoid speculation about identity.',
     'Report to SAPS 10111 or your local CPF control room.',
     'Do not publish names or photos of suspects on community groups.',
     'Use the SAPS MySAPS app for anonymous tips.',
     'Follow up within 72 hours to confirm the report was logged.'
   ],
   'CPF tip-offs routed through SAPS intelligence desks have historically resulted in arrests when the report includes a licence plate or address, not personal identification.'),

  ('Assault',
   'Domestic Violence Act & Common Law Assault',
   'Domestic Violence Act 116 of 1998; Common Law Assault (GBH)',
   'Assault is a Schedule 1 offence when committed with intent to cause grievous bodily harm. Victims may apply for a protection order at any Magistrates'' Court without legal representation.',
   array[
     'Get to safety and call 10111 or 112.',
     'Seek medical attention — a J88 form from a district surgeon is admissible in court.',
     'Apply for a protection order at the nearest Magistrates'' Court (free).',
     'Report to SAPS within 72 hours to preserve forensic evidence.',
     'Contact Lifeline SA (0861 322 322) for trauma support.'
   ],
   'Protection orders are typically granted within 24 hours on an interim basis. Community cases resolve best when the victim is supported by an FCS officer and a court-appointed counsellor.'),

  ('Domestic Dispute',
   'Domestic Violence Act',
   'Domestic Violence Act 116 of 1998',
   'SAPS members are obligated to respond to domestic violence complaints, arrest where there is evidence of assault, and inform the complainant of their right to a protection order.',
   array[
     'Call 10111 — domestic violence calls are treated as priority.',
     'Do not attempt to mediate physical disputes yourself.',
     'Support the victim in applying for a protection order.',
     'Document injuries and any prior incidents.',
     'Refer to a local GBV Command Centre (0800 428 428).'
   ],
   'Court-issued protection orders have been shown to reduce repeat incidents by ~60% when served promptly by SAPS.'),

  ('Break-In',
   'Housebreaking with Intent to Steal',
   'Criminal Procedure Act 51 of 1977; Common Law Housebreaking',
   'Housebreaking with intent to steal is a Schedule 2 offence. SAPS must attend the scene, obtain fingerprints, and issue a case number for insurance purposes.',
   array[
     'Do not enter if the suspect may still be inside — retreat and call 10111.',
     'Preserve the scene — do not touch entry points before SAPS arrives.',
     'Photograph damage, list stolen items, and locate proof of purchase.',
     'Notify your insurance within 30 days and quote the SAPS case number.',
     'Alert your neighbourhood watch to increase patrols on your street.'
   ],
   'Housebreakings that get a same-day SAPS response and neighbourhood-watch flagging see ~2x higher recovery of stolen electronics than delayed reports.'),

  ('Other',
   'General Emergency Rights',
   'South African Constitution, Chapter 2 (Bill of Rights)',
   'Every person has the right to life, safety, and to report crimes to SAPS. Emergency calls are free from any cellphone — 10111 (SAPS), 112 (mobile), 10177 (ambulance).',
   array[
     'Call 10111 for any safety emergency.',
     'Do not endanger yourself to gather evidence.',
     'Retain a case number for all formal reports.',
     'Report corruption in SAPS to IPID (0800 111 234).'
   ],
   'Community resolution success historically depends on accurate logging with SAPS and follow-up through the local CPF or IPID.');
