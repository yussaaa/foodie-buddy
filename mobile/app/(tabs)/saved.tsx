import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useRestaurantStore } from "@/store/restaurantStore";
import { useAuthStore } from "@/store/authStore";
import type { Restaurant } from "@/types";

type Filter = "all" | "visited" | "wishlist";

export default function SavedScreen() {
  const { restaurants, loading, fetchRestaurants } = useRestaurantStore();
  const language = useAuthStore((s) => s.language);
  const [filter, setFilter] = useState<Filter>("all");
  const zh = language === "zh";

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const filtered = restaurants.filter((r) => {
    if (filter === "visited") return r.is_visited;
    if (filter === "wishlist") return r.is_wishlist && !r.is_visited;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: zh ? "全部" : "All" },
    { key: "visited", label: zh ? "已打卡" : "Visited" },
    { key: "wishlist", label: zh ? "心愿单" : "Wishlist" },
  ];

  function renderItem({ item }: { item: Restaurant }) {
    return (
      <TouchableOpacity
        onPress={() => router.push(`/restaurant/${item.id}`)}
        className="bg-zinc-900 rounded-2xl p-4 mb-3 border border-zinc-800 active:opacity-80"
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-3">
            <Text className="text-white font-semibold text-base" numberOfLines={1}>
              {item.name}
            </Text>
            <Text className="text-orange-400 text-sm mt-0.5">
              {item.cuisine_type}
            </Text>
            {item.address && (
              <View className="flex-row items-center gap-1 mt-1">
                <Ionicons name="location-outline" size={12} color="#71717a" />
                <Text className="text-zinc-400 text-xs flex-1" numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
            )}
          </View>
          <View className="items-end gap-1">
            {item.rating && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={11} color="#f97316" />
                <Text className="text-zinc-300 text-xs">
                  {Number(item.rating).toFixed(1)}
                </Text>
              </View>
            )}
            <View
              className={`px-2 py-0.5 rounded-full ${
                item.is_visited ? "bg-green-900/60" : "bg-orange-900/60"
              }`}
            >
              <Text
                className={`text-xs ${
                  item.is_visited ? "text-green-400" : "text-orange-400"
                }`}
              >
                {item.is_visited
                  ? zh ? "已打卡" : "Visited"
                  : zh ? "心愿单" : "Wishlist"}
              </Text>
            </View>
          </View>
        </View>

        {item.user_rating && (
          <View className="flex-row items-center gap-1 mt-2 pt-2 border-t border-zinc-800">
            <Text className="text-zinc-500 text-xs">{zh ? "我的评分：" : "My rating: "}</Text>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < (item.user_rating ?? 0) ? "star" : "star-outline"}
                size={11}
                color="#f97316"
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      {/* Header */}
      <View className="px-4 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold">
          {zh ? "已保存" : "Saved"}
        </Text>
        <Text className="text-zinc-400 text-sm mt-1">
          {restaurants.length} {zh ? "家餐厅" : "restaurants"}
        </Text>
      </View>

      {/* Filter tabs */}
      <View className="flex-row px-4 gap-2 mb-3">
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full border ${
              filter === f.key
                ? "bg-orange-500 border-orange-500"
                : "border-zinc-700 bg-zinc-900"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                filter === f.key ? "text-white" : "text-zinc-400"
              }`}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && restaurants.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchRestaurants}
              tintColor="#f97316"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20 gap-3">
              <Ionicons name="restaurant-outline" size={48} color="#3f3f46" />
              <Text className="text-zinc-500 text-base">
                {zh ? "还没有保存的餐厅" : "No saved restaurants yet"}
              </Text>
              <Text className="text-zinc-600 text-sm">
                {zh ? "去探索 Tab 搜索吧！" : "Go explore some restaurants!"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
