import { View, Text, Image, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { getDishPhoto } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import type { SignatureDish } from "@/types/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PHOTO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface Props {
  dish: SignatureDish;
  language: "zh" | "en";
}

export function SignatureDishCard({ dish, language }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const zh = language === "zh";

  useEffect(() => {
    loadPhoto();
  }, [dish.search_name]);

  async function loadPhoto() {
    const cacheKey = `dish-photo::${dish.search_name.toLowerCase().trim()}`;
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { url, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < PHOTO_TTL_MS) {
          setPhotoUrl(url);
          setPhotoLoading(false);
          return;
        }
      }
    } catch {}

    try {
      const { url } = await getDishPhoto(dish.search_name);
      setPhotoUrl(url);
      if (url) {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ url, timestamp: Date.now() })
        );
      }
    } catch {}
    setPhotoLoading(false);
  }

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.85}
      className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800"
    >
      {/* Photo */}
      <View className="h-40 bg-zinc-800 items-center justify-center">
        {photoLoading ? (
          <ActivityIndicator color="#f97316" />
        ) : photoUrl ? (
          <Image
            source={{ uri: photoUrl }}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="restaurant-outline" size={40} color="#3f3f46" />
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <View className="flex-row justify-between items-start">
          <Text className="text-white font-semibold text-base flex-1 pr-2">
            {dish.name}
          </Text>
          {dish.price_range && (
            <Text className="text-orange-400 text-sm">{dish.price_range}</Text>
          )}
        </View>
        <Text
          className="text-zinc-400 text-sm mt-1 leading-5"
          numberOfLines={expanded ? undefined : 2}
        >
          {dish.description}
        </Text>

        {expanded && (
          <View className="mt-3 gap-2">
            {dish.key_ingredients && dish.key_ingredients.length > 0 && (
              <View>
                <Text className="text-zinc-500 text-xs mb-1">
                  {zh ? "主要食材" : "Key Ingredients"}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {dish.key_ingredients.map((ing, i) => (
                    <View key={i} className="bg-zinc-800 px-2 py-0.5 rounded-full">
                      <Text className="text-zinc-300 text-xs">{ing}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {dish.cooking_method && (
              <Text className="text-zinc-400 text-xs leading-5">
                <Text className="text-zinc-500">{zh ? "烹饪方式：" : "Method: "}</Text>
                {dish.cooking_method}
              </Text>
            )}
            {dish.how_to_eat && (
              <Text className="text-zinc-400 text-xs leading-5">
                <Text className="text-zinc-500">{zh ? "食用方式：" : "How to eat: "}</Text>
                {dish.how_to_eat}
              </Text>
            )}
          </View>
        )}

        <View className="flex-row justify-end mt-2">
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#52525b"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
