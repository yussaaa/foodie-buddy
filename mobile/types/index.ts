// ─── 用户相关 ───────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// ─── 餐厅相关 ───────────────────────────────────────────────

export interface SignatureDish {
  name: string;
  description: string;
}

export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  cuisine_type: string | null;
  google_place_id: string | null;
  source_url: string | null;        // 用户输入的网址或 Google Maps 链接
  ai_description: string | null;    // AI 生成的菜系介绍
  rating: number | null;            // Google Places 评分
  notes: string | null;             // 用户笔记
  is_visited: boolean;
  is_wishlist: boolean;
  // User annotation fields
  user_rating: number | null;       // 用户个人评分 1-5
  want_to_revisit: boolean | null;  // 是否还想再去
  visited_at: string | null;        // 到访日期 ISO string
  signature_dishes: SignatureDish[] | null;  // AI 推荐招牌菜
  ai_content: Record<string, unknown> | null; // 完整 AI 内容缓存
  created_at: string;
  updated_at: string;
}

// ─── AI 对话相关 ────────────────────────────────────────────

export interface Conversation {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

// ─── 营养相关 ───────────────────────────────────────────────

export interface NutritionInfo {
  id: string;
  restaurant_id: string;
  dish_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fiber_g: number | null;
  ai_analysis: string | null;       // AI 分析说明
  created_at: string;
}

// ─── 美食日记 ───────────────────────────────────────────────

export interface FoodDiaryEntry {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  title: string;
  content: string | null;
  photo_url: string | null;
  rating: number | null;
  visited_at: string;
  created_at: string;
}
