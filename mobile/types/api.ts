// Mirror of src/app/api/explore/route.ts ExploreResponse
// and src/lib/openai.ts AIRestaurantInfo — kept in sync manually

export interface SignatureDish {
  name: string;
  search_name: string;
  description: string;
  key_ingredients?: string[];
  cooking_method?: string;
  how_to_eat?: string;
  price_range?: string;
}

export interface AIRestaurantInfo {
  cuisine_type: string;
  introduction: string;
  restaurant_spotlight?: {
    neighborhood: string;
    hours: string;
    parking: string;
  };
  history: string;
  common_ingredients?: string[];
  common_spices?: string[];
  food_pairings?: string[];
  cuisine_classic_dishes?: string[];
  signature_dishes: SignatureDish[];
  nutrition_highlights: string;
  dietary_notes: string;
}

export interface ExploreResponse {
  restaurant: {
    name: string;
    address: string | null;
    lat: number | null;
    lng: number | null;
    cuisine_type: string;
    google_place_id: string | null;
    rating: number | null;
    reviews: Array<{ text: string; rating: number; authorName: string }>;
    photoNames: string[];
    openingHours?: string[] | null;
    website?: string | null;
  };
  ai: AIRestaurantInfo;
  fromCache?: boolean;
  restaurantId?: string;
  savedDetails?: {
    is_visited: boolean;
    user_rating: number | null;
    visited_at: string | null;
    want_to_revisit: boolean | null;
  };
}
