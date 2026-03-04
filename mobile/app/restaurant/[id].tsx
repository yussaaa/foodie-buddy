import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRestaurantStore } from "@/store/restaurantStore";
import { useAuthStore } from "@/store/authStore";
import { updateRestaurant } from "@/lib/api";
import type { Restaurant } from "@/types";

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const restaurants = useRestaurantStore((s) => s.restaurants);
  const updateStore = useRestaurantStore((s) => s.updateRestaurant);
  const language = useAuthStore((s) => s.language);
  const zh = language === "zh";

  const restaurant = restaurants.find((r) => r.id === id);

  const [userRating, setUserRating] = useState(restaurant?.user_rating ?? 0);
  const [isVisited, setIsVisited] = useState(restaurant?.is_visited ?? false);
  const [wantToRevisit, setWantToRevisit] = useState(
    restaurant?.want_to_revisit ?? null
  );
  const [notes, setNotes] = useState(restaurant?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: restaurant?.name ?? "" });
  }, [restaurant?.name]);

  if (!restaurant) {
    return (
      <View className="flex-1 bg-[#1a1a1a] items-center justify-center">
        <Text className="text-zinc-400">{zh ? "餐厅未找到" : "Restaurant not found"}</Text>
      </View>
    );
  }

  const ai = restaurant.ai_content as Record<string, unknown> | null;

  async function handleSave() {
    if (!id || saving) return;
    setSaving(true);
    try {
      const updated = await updateRestaurant(id, {
        user_rating: userRating || null,
        is_visited: isVisited,
        want_to_revisit: wantToRevisit,
        notes: notes.trim() || null,
      });
      updateStore(id, updated);
      Alert.alert(zh ? "已保存" : "Saved");
    } catch {
      Alert.alert(zh ? "保存失败" : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-[#1a1a1a]">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Restaurant header */}
        <View className="px-4 pt-4 pb-4 border-b border-zinc-800">
          <Text className="text-white text-xl font-bold">{restaurant.name}</Text>
          <View className="flex-row items-center gap-3 mt-1.5">
            <Text className="text-orange-400 text-sm">{restaurant.cuisine_type}</Text>
            {restaurant.rating && (
              <View className="flex-row items-center gap-1">
                <Ionicons name="star" size={12} color="#f97316" />
                <Text className="text-zinc-300 text-sm">
                  {Number(restaurant.rating).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
          {restaurant.address && (
            <View className="flex-row items-center gap-1 mt-1.5">
              <Ionicons name="location-outline" size={13} color="#71717a" />
              <Text className="text-zinc-400 text-sm flex-1">{restaurant.address}</Text>
            </View>
          )}
        </View>

        {/* AI intro snippet */}
        {restaurant.ai_description && (
          <View className="px-4 py-4 border-b border-zinc-800">
            <Text className="text-zinc-400 text-xs font-medium mb-2">
              {zh ? "AI 介绍" : "AI Introduction"}
            </Text>
            <Text className="text-zinc-300 text-sm leading-6" numberOfLines={4}>
              {restaurant.ai_description}
            </Text>
          </View>
        )}

        {/* Signature dishes preview */}
        {restaurant.signature_dishes && restaurant.signature_dishes.length > 0 && (
          <View className="px-4 py-4 border-b border-zinc-800">
            <Text className="text-zinc-400 text-xs font-medium mb-3">
              {zh ? "招牌菜" : "Signature Dishes"}
            </Text>
            <View className="gap-2">
              {restaurant.signature_dishes.slice(0, 3).map((dish, i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <Text className="text-zinc-300 text-sm">{dish.name}</Text>
                </View>
              ))}
              {restaurant.signature_dishes.length > 3 && (
                <Text className="text-zinc-500 text-xs ml-3.5">
                  +{restaurant.signature_dishes.length - 3} {zh ? "道菜" : "more"}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* My record section */}
        <View className="px-4 py-4">
          <Text className="text-white font-semibold text-base mb-4">
            {zh ? "我的记录" : "My Record"}
          </Text>

          {/* Visited toggle */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-zinc-300 text-sm">{zh ? "已到访" : "Visited"}</Text>
            <TouchableOpacity
              onPress={() => setIsVisited(!isVisited)}
              className={`w-12 h-6 rounded-full px-0.5 items-center flex-row ${
                isVisited ? "bg-orange-500 justify-end" : "bg-zinc-700 justify-start"
              }`}
            >
              <View className="w-5 h-5 rounded-full bg-white shadow" />
            </TouchableOpacity>
          </View>

          {/* My rating */}
          <View className="mb-4">
            <Text className="text-zinc-300 text-sm mb-2">
              {zh ? "我的评分" : "My rating"}
            </Text>
            <View className="flex-row gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)}>
                  <Ionicons
                    name={star <= userRating ? "star" : "star-outline"}
                    size={28}
                    color={star <= userRating ? "#f97316" : "#3f3f46"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Want to revisit */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-zinc-300 text-sm">
              {zh ? "还想再去" : "Want to revisit"}
            </Text>
            <View className="flex-row gap-2">
              {[true, false].map((val) => (
                <TouchableOpacity
                  key={String(val)}
                  onPress={() => setWantToRevisit(wantToRevisit === val ? null : val)}
                  className={`px-3 py-1.5 rounded-full border ${
                    wantToRevisit === val
                      ? val
                        ? "bg-green-600 border-green-600"
                        : "bg-zinc-600 border-zinc-600"
                      : "border-zinc-700"
                  }`}
                >
                  <Text className="text-white text-sm">
                    {val ? (zh ? "是" : "Yes") : (zh ? "否" : "No")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View className="mb-5">
            <Text className="text-zinc-300 text-sm mb-2">
              {zh ? "笔记" : "Notes"}
            </Text>
            <TextInput
              className="bg-zinc-900 text-white rounded-xl px-4 py-3 text-sm border border-zinc-800"
              placeholder={zh ? "记录你的感受..." : "Write your notes..."}
              placeholderTextColor="#52525b"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="bg-orange-500 rounded-xl py-4 items-center active:opacity-80"
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {zh ? "保存记录" : "Save Record"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
