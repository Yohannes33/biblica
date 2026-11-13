-- Supabase Schema for Biblica (Bible Verse Memorization App)
-- Run this migration in the Supabase SQL Editor (https://app.supabase.com/project/_/sql)

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text default 'Scripture Seeker',
  avatar_url text,
  preferred_translation text default 'KJV',
  daily_goal_verses int default 3,
  theme text default 'light',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. USER STATS TABLE
create table if not exists public.user_stats (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  xp int default 0,
  level int default 1,
  streak_days int default 1,
  last_active_date date default current_date,
  quizzes_completed int default 0,
  cards_reviewed int default 0,
  cloze_completed int default 0,
  scrambles_completed int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. VERSE PROGRESS TABLE
create table if not exists public.verse_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  verse_id text not null,
  mastery_score int default 0,
  times_practiced int default 0,
  correct_answers int default 0,
  cloze_stage int default 1,
  last_practiced bigint not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, verse_id)
);

-- 4. CUSTOM VERSES TABLE
create table if not exists public.custom_verses (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  reference text not null,
  book text not null,
  chapter int not null,
  verse_num text not null,
  text text not null,
  category text default 'Custom',
  translation text default 'KJV',
  tags text[] default array['custom'],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.verse_progress enable row level security;
alter table public.custom_verses enable row level security;

-- Profiles: Users can select and update their own profile
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- User Stats: Users can view & update their own stats
create policy "Users can view own stats" 
  on public.user_stats for select 
  using (auth.uid() = user_id);

create policy "Users can insert/update own stats" 
  on public.user_stats for all 
  using (auth.uid() = user_id);

-- Verse Progress: Users can manage their progress
create policy "Users can manage own verse progress" 
  on public.verse_progress for all 
  using (auth.uid() = user_id);

-- Custom Verses: Users can manage their custom verses
create policy "Users can manage own custom verses" 
  on public.custom_verses for all 
  using (auth.uid() = user_id);

-- Automatic Profile Creation Trigger on Sign Up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', 'Scripture Pilgrim'));

  insert into public.user_stats (user_id, xp, level, streak_days)
  values (new.id, 0, 1, 1);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
