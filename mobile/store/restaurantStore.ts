import { create } from "zustand";
import type { Restaurant } from "@/types";
import { supabase } from "@/lib/supabase";

interface RestaurantState {
  restaurants: Restaurant[];
  loading: boolean;
  error: string | null;
  // Actions
  fetchRestaurants: () => Promise<void>;
  addRestaurant: (r: Restaurant) => void;
  updateRestaurant: (id: string, fields: Partial<Restaurant>) => void;
  removeRestaurant: (id: string) => void;
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  restaurants: [],
  loading: false,
  error: null,

  fetchRestaurants: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ restaurants: (data as Restaurant[]) ?? [], loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "fetch_failed",
        loading: false,
      });
    }
  },

  addRestaurant: (r) =>
    set((state) => ({ restaurants: [r, ...state.restaurants] })),

  updateRestaurant: (id, fields) =>
    set((state) => ({
      restaurants: state.restaurants.map((r) =>
        r.id === id ? { ...r, ...fields } : r
      ),
    })),

  removeRestaurant: (id) =>
    set((state) => ({
      restaurants: state.restaurants.filter((r) => r.id !== id),
    })),
}));
