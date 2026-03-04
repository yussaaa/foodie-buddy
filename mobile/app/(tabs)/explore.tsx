import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { exploreRestaurant, saveRestaurant } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantStore } from "@/store/restaurantStore";
import type { ExploreResponse } from "@/types/api";
import { SignatureDishCard } from "@/components/explore/SignatureDishCard";
import { ExploreResultTabs } from "@/components/explore/ExploreResultTabs";

export default function ExploreScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExploreResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const language = useAuthStore((s) => s.language);
  const addRestaurant = useRestaurantStore((s) => s.addRestaurant);
  const zh = language === "zh";

  async function handleExplore() {
    const q = input.trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    try {
      const data = await exploreRestaurant(q, language);
      setResult(data);
      if (data.restaurantId) setSaved(true); // already in user's list
    } catch {
      Alert.alert(
        zh ? "探索失败" : "Explore failed",
        zh ? "请检查网络连接后重试" : "Please check your connection and try again"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result || saving) return;
    setSaving(true);
    try {
      const saved = await saveRestaurant({
        name: result.restaurant.name,
        address: result.restaurant.address,
        lat: result.restaurant.lat,
        lng: result.restaurant.lng,
        cuisine_type: result.restaurant.cuisine_type,
        google_place_id: result.restaurant.google_place_id,
        rating: result.restaurant.rating,
        ai_description: result.ai.introduction,
        signature_dishes: result.ai.signature_dishes,
        ai_content: result.ai,
      });
      addRestaurant(saved);
      setSaved(true);
    } catch {
      Alert.alert(zh ? "保存失败" : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Header */}
          <View className="px-4 pt-4 pb-3">
            <Text className="text-white text-2xl font-bold">
              {zh ? "探索餐厅" : "Explore"}
            </Text>
            <Text className="text-zinc-400 text-sm mt-1">
              {zh
                ? "输入餐厅名、网址或 Google Maps 链接"
                : "Enter a restaurant name, URL, or Google Maps link"}
            </Text>
          </View>

          {/* Search bar */}
          <View className="px-4 flex-row gap-2">
            <TextInput
              className="flex-1 bg-zinc-900 text-white rounded-xl px-4 py-3 text-base border border-zinc-800"
              placeholder={zh ? "例：Nobu New York 或 Maps 链接..." : "e.g. Nobu New York or Maps link..."}
              placeholderTextColor="#71717a"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleExplore}
              returnKeyType="search"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleExplore}
              disabled={loading || !input.trim()}
              className="bg-orange-500 rounded-xl px-4 items-center justify-center active:opacity-80"
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Loading state */}
          {loading && (
            <View className="mt-12 items-center gap-3">
              <ActivityIndicator color="#f97316" size="large" />
              <Text className="text-zinc-400 text-sm">
                {zh ? "AI 探索中..." : "AI exploring..."}
              </Text>
            </View>
          )}

          {/* Result */}
          {result && !loading && (
            <View className="mt-4 px-4 gap-4">
              {/* Restaurant header card */}
              <View className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
                <Text className="text-white text-xl font-bold">
                  {result.restaurant.name}
                </Text>
                <View className="flex-row items-center gap-3 mt-2">
                  <Text className="text-orange-400 text-sm font-medium">
                    {result.restaurant.cuisine_type}
                  </Text>
                  {result.restaurant.rating && (
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="star" size={12} color="#f97316" />
                      <Text className="text-zinc-300 text-sm">
                        {result.restaurant.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
                {result.restaurant.address && (
                  <View className="flex-row items-center gap-1 mt-2">
                    <Ionicons name="location-outline" size={14} color="#71717a" />
                    <Text className="text-zinc-400 text-sm flex-1" numberOfLines={2}>
                      {result.restaurant.address}
                    </Text>
                  </View>
                )}
              </View>

              {/* Tab panels (intro / history / dishes / nutrition) */}
              <ExploreResultTabs result={result} language={language} />

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saved || saving}
                className={`rounded-xl py-4 items-center ${
                  saved ? "bg-zinc-800" : "bg-orange-500 active:opacity-80"
                }`}
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Ionicons
                      name={saved ? "heart" : "heart-outline"}
                      size={18}
                      color={saved ? "#f97316" : "white"}
                    />
                    <Text
                      className={`font-semibold text-base ${
                        saved ? "text-orange-400" : "text-white"
                      }`}
                    >
                      {saved
                        ? zh ? "已收藏 ✓" : "Saved ✓"
                        : zh ? "加入收藏" : "Save"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
