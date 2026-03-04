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

-- ─────────────────────────────────────────────
-- 8. AI Prompt 管理表
--    存储所有 OpenAI prompt，方便在不重新部署的情况下修改
--    Templates 使用 {{placeholder}} 语法
-- ─────────────────────────────────────────────
create table if not exists public.ai_prompts (
  id           uuid        primary key default gen_random_uuid(),
  key          text        unique not null,        -- 唯一标识，e.g. "restaurant_info_system"
  content      text        not null,               -- prompt 正文（user template 用 {{placeholder}}）
  role         text        not null check (role in ('system', 'user')),
  model        text,                               -- OpenAI model（仅 system 行有效）
  temperature  float,                              -- 生成温度（仅 system 行有效）
  max_tokens   integer,                            -- 最大 token 数（仅 system 行有效）
  description  text,                               -- 人工备注
  is_active    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 允许未登录服务端代码读取（anon key）
alter table public.ai_prompts enable row level security;

create policy "Public read ai_prompts" on public.ai_prompts
  for select using (true);

-- 自动更新 updated_at
create trigger update_ai_prompts_updated_at before update on public.ai_prompts
  for each row execute procedure public.update_updated_at();

-- ── 初始 Prompt 数据 ───────────────────────────────────────────────────────────
-- 使用 $$ 美元符号引用避免单引号转义问题。
-- 修改 content 后重新运行 INSERT … ON CONFLICT DO UPDATE 即可热更新。

insert into public.ai_prompts (key, role, model, temperature, max_tokens, description, content)
values (
  'restaurant_info_system',
  'system',
  'gpt-4o-mini',
  0.7,
  4000,
  'System prompt for restaurant info generation (also holds model/temperature/max_tokens config)',
  $prompt$You are an expert culinary historian and food critic.
Your task is to provide detailed, accurate, and engaging information about restaurants and their cuisines.
Always respond in valid JSON format with no markdown formatting.$prompt$
)
on conflict (key) do update
  set content     = excluded.content,
      model       = excluded.model,
      temperature = excluded.temperature,
      max_tokens  = excluded.max_tokens,
      description = excluded.description,
      updated_at  = now();

insert into public.ai_prompts (key, role, description, content)
values (
  'restaurant_info_user',
  'user',
  'User prompt template for restaurant info. Placeholders: {{name}}, {{address}}, {{types}}, {{rating}}, {{lang}}',
  $prompt$Restaurant details:
- Name: {{name}}
- Address: {{address}}
- Categories: {{types}}
- Rating: {{rating}}

Please provide a comprehensive guide in {{lang}}.
IMPORTANT: The "signature_dishes" array must include between 5 and 10 of the most iconic and representative dishes of this cuisine type. Do not return fewer than 5 dishes.
Respond with ONLY a JSON object (no markdown, no code blocks) with these exact fields:

{
  "cuisine_type": "Brief cuisine label (e.g., 日本料理, Italian, Sichuan Chinese) - max 20 chars",

  "introduction": "2-3 engaging paragraphs introducing this restaurant and its cuisine style. Include what makes it unique.",

  "restaurant_spotlight": {
    "neighborhood": "1-2 sentences describing the neighborhood character based on the address. If address is unknown, describe what kind of location this cuisine type typically favors.",
    "hours": "Typical operating hours for this type of restaurant. Format: 'Mon–Fri HH:mm–HH:mm, Sat–Sun HH:mm–HH:mm'. Append '(请以实际营业时间为准)' in Chinese or '(estimate — verify on-site)' in English.",
    "parking": "1 sentence on parking accessibility inferred from the address and area type (e.g. street parking, garage nearby, difficult in dense urban area)."
  },

  "history": "2-3 paragraphs about the cultural and historical background of this cuisine type. Include origin, evolution, and cultural significance.",

  "common_ingredients": ["Up to 8 ingredients that define this cuisine — single words or short phrases, e.g. 'Rice noodles', 'Lemongrass'"],

  "common_spices": ["Up to 6 signature spices, sauces, or condiments used in this cuisine, e.g. 'Fish sauce', 'Five-spice powder'"],

  "food_pairings": ["Up to 5 drinks, sides, or accompaniments that pair well with this cuisine, e.g. 'Jasmine tea', 'Cold beer', 'Steamed rice'"],

  "signature_dishes": [
    {
      "name": "Dish name in {{lang}} (for display)",
      "search_name": "Dish name in its ORIGINAL menu language, e.g. English for Western/Japanese/Italian restaurants, Chinese for Chinese restaurants — used for image search only",
      "description": "50-70 word overview of this dish's taste profile, texture, and cultural significance",
      "key_ingredients": ["Up to 5 main ingredients in this dish, e.g. 'Wagyu beef', 'Ponzu sauce'"],
      "cooking_method": "1 sentence describing the primary cooking technique, e.g. 'Slow-braised for 6 hours in aromatic broth until fall-apart tender.'",
      "how_to_eat": "1-2 sentences on the best way to enjoy this dish — dipping sauces, correct utensils, ideal order of eating, or what to pair it with at the table.",
      "price_range": "Estimated price at this specific restaurant, inferred from its rating and cuisine type. Use local currency symbol. E.g. '$18-28' or '¥68-98'. Append '(estimate)' or '(参考价格)'."
    },
    "... include 5–10 dishes total using the same structure above ..."
  ],

  "nutrition_highlights": "2 paragraphs summarizing the typical nutritional characteristics of this cuisine. Include macronutrients, common ingredients, and general health impact.",

  "dietary_notes": "1-2 paragraphs covering: common allergens in this cuisine, suitability for vegetarians/vegans, gluten considerations, and general dietary advice."
}$prompt$
)
on conflict (key) do update
  set content     = excluded.content,
      description = excluded.description,
      updated_at  = now();
