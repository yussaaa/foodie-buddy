-- =============================================
-- Foodie Buddy 数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- =============================================

-- 启用 UUID 扩展
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. 用户资料表（关联 Supabase Auth）
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 新用户注册后自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- 2. 餐厅表
-- ─────────────────────────────────────────────
create table if not exists public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  address text,
  lat numeric(10, 7),
  lng numeric(10, 7),
  cuisine_type text,
  google_place_id text,
  source_url text,
  ai_description text,
  rating numeric(2, 1) check (rating >= 1 and rating <= 5),
  notes text,
  is_visited boolean default false not null,
  is_wishlist boolean default false not null,
  -- User annotation fields (added after initial schema)
  user_rating numeric(2,1) check (user_rating >= 1 and user_rating <= 5),
  want_to_revisit boolean default null,
  visited_at timestamptz default null,
  signature_dishes jsonb default null,  -- array of {name, description} objects
  ai_content jsonb default null,         -- full AIRestaurantInfo for cache
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────
-- Run this in Supabase SQL Editor to add new columns to existing DB:
-- ALTER TABLE public.restaurants
--   ADD COLUMN IF NOT EXISTS user_rating      numeric(2,1) CHECK (user_rating >= 1 AND user_rating <= 5),
--   ADD COLUMN IF NOT EXISTS want_to_revisit  boolean DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS visited_at       timestamptz DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS signature_dishes jsonb DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS ai_content       jsonb DEFAULT NULL;
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- 3. AI 对话表
-- ─────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  title text not null default '新对话',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────
-- 4. 营养信息表
-- ─────────────────────────────────────────────
create table if not exists public.nutrition_info (
  id uuid default uuid_generate_v4() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  dish_name text not null,
  calories numeric(6, 1),
  protein_g numeric(5, 1),
  carbs_g numeric(5, 1),
  fat_g numeric(5, 1),
  fiber_g numeric(5, 1),
  ai_analysis text,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────
-- 5. 美食日记表
-- ─────────────────────────────────────────────
create table if not exists public.food_diary (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  title text not null,
  content text,
  photo_url text,
  rating numeric(2, 1) check (rating >= 1 and rating <= 5),
  visited_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

-- ─────────────────────────────────────────────
-- 6. Row Level Security (RLS) - 用户只能访问自己的数据
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.nutrition_info enable row level security;
alter table public.food_diary enable row level security;

-- profiles
create policy "用户可查看自己的资料" on public.profiles
  for select using (auth.uid() = id);
create policy "用户可更新自己的资料" on public.profiles
  for update using (auth.uid() = id);

-- restaurants
create policy "用户可查看自己的餐厅" on public.restaurants
  for select using (auth.uid() = user_id);
create policy "用户可添加餐厅" on public.restaurants
  for insert with check (auth.uid() = user_id);
create policy "用户可更新自己的餐厅" on public.restaurants
  for update using (auth.uid() = user_id);
create policy "用户可删除自己的餐厅" on public.restaurants
  for delete using (auth.uid() = user_id);

-- conversations
create policy "用户可查看自己的对话" on public.conversations
  for select using (auth.uid() = user_id);
create policy "用户可创建对话" on public.conversations
  for insert with check (auth.uid() = user_id);
create policy "用户可更新自己的对话" on public.conversations
  for update using (auth.uid() = user_id);
create policy "用户可删除自己的对话" on public.conversations
  for delete using (auth.uid() = user_id);

-- messages
create policy "用户可查看自己对话的消息" on public.messages
  for select using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );
create policy "用户可添加消息" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- nutrition_info
create policy "用户可查看自己餐厅的营养信息" on public.nutrition_info
  for select using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = nutrition_info.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  );
create policy "用户可添加营养信息" on public.nutrition_info
  for insert with check (
    exists (
      select 1 from public.restaurants
      where restaurants.id = nutrition_info.restaurant_id
      and restaurants.user_id = auth.uid()
    )
  );

-- food_diary
create policy "用户可查看自己的日记" on public.food_diary
  for select using (auth.uid() = user_id);
create policy "用户可添加日记" on public.food_diary
  for insert with check (auth.uid() = user_id);
create policy "用户可更新自己的日记" on public.food_diary
  for update using (auth.uid() = user_id);
create policy "用户可删除自己的日记" on public.food_diary
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 7. 自动更新 updated_at 字段
-- ─────────────────────────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at before update on public.profiles
  for each row execute procedure public.update_updated_at();
create trigger update_restaurants_updated_at before update on public.restaurants
  for each row execute procedure public.update_updated_at();
create trigger update_conversations_updated_at before update on public.conversations
  for each row execute procedure public.update_updated_at();
