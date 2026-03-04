import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { ExploreResponse } from "@/types/api";
import { SignatureDishCard } from "./SignatureDishCard";

type Tab = "intro" | "history" | "dishes" | "nutrition";

interface Props {
  result: ExploreResponse;
  language: "zh" | "en";
}

export function ExploreResultTabs({ result, language }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("intro");
  const zh = language === "zh";
  const { ai, restaurant } = result;

  const tabs: { key: Tab; label: string }[] = [
    { key: "intro", label: zh ? "介绍" : "Intro" },
    { key: "history", label: zh ? "历史" : "History" },
    { key: "dishes", label: zh ? "招牌菜" : "Dishes" },
    { key: "nutrition", label: zh ? "营养" : "Nutrition" },
  ];

  return (
    <View>
      {/* Tab bar */}
      <View className="flex-row border-b border-zinc-800 mb-3">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 items-center border-b-2 ${
              activeTab === tab.key
                ? "border-orange-500"
                : "border-transparent"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? "text-orange-400" : "text-zinc-500"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === "intro" && (
        <View className="gap-3">
          <Text className="text-zinc-300 text-sm leading-6">{ai.introduction}</Text>
          {ai.restaurant_spotlight && (
            <View className="bg-zinc-800/60 rounded-xl p-3 gap-2">
              <InfoRow
                icon="location-outline"
                text={ai.restaurant_spotlight.neighborhood}
              />
              <InfoRow icon="time-outline" text={ai.restaurant_spotlight.hours} />
              <InfoRow icon="car-outline" text={ai.restaurant_spotlight.parking} />
            </View>
          )}
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <View className="bg-zinc-800/60 rounded-xl p-3">
              <Text className="text-zinc-400 text-xs font-medium mb-2">
                {zh ? "营业时间" : "Opening Hours"}
              </Text>
              {restaurant.openingHours.map((h, i) => (
                <Text key={i} className="text-zinc-300 text-xs leading-5">{h}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === "history" && (
        <View className="gap-3">
          <Text className="text-zinc-300 text-sm leading-6">{ai.history}</Text>
          {ai.common_ingredients && ai.common_ingredients.length > 0 && (
            <TagGroup
              label={zh ? "常用食材" : "Key Ingredients"}
              items={ai.common_ingredients}
              color="orange"
            />
          )}
          {ai.common_spices && ai.common_spices.length > 0 && (
            <TagGroup
              label={zh ? "香料 & 调料" : "Spices & Condiments"}
              items={ai.common_spices}
              color="yellow"
            />
          )}
          {ai.food_pairings && ai.food_pairings.length > 0 && (
            <TagGroup
              label={zh ? "配餐推荐" : "Food Pairings"}
              items={ai.food_pairings}
              color="blue"
            />
          )}
        </View>
      )}

      {activeTab === "dishes" && (
        <View className="gap-3">
          {ai.signature_dishes.map((dish, i) => (
            <SignatureDishCard key={i} dish={dish} language={language} />
          ))}
        </View>
      )}

      {activeTab === "nutrition" && (
        <View className="gap-3">
          <Text className="text-zinc-300 text-sm leading-6">
            {ai.nutrition_highlights}
          </Text>
          <View className="bg-zinc-800/60 rounded-xl p-3">
            <Text className="text-zinc-400 text-xs font-medium mb-2">
              {zh ? "饮食注意" : "Dietary Notes"}
            </Text>
            <Text className="text-zinc-300 text-sm leading-6">{ai.dietary_notes}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }) {
  return (
    <View className="flex-row gap-2">
      <Ionicons name={icon} size={14} color="#71717a" style={{ marginTop: 2 }} />
      <Text className="text-zinc-300 text-xs leading-5 flex-1">{text}</Text>
    </View>
  );
}

function TagGroup({
  label,
  items,
  color,
}: {
  label: string;
  items: string[];
  color: "orange" | "yellow" | "blue";
}) {
  const colorMap = {
    orange: "bg-orange-900/40 text-orange-300",
    yellow: "bg-yellow-900/40 text-yellow-300",
    blue: "bg-blue-900/40 text-blue-300",
  };
  return (
    <View>
      <Text className="text-zinc-400 text-xs font-medium mb-2">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item, i) => (
          <View key={i} className={`px-2.5 py-1 rounded-full ${colorMap[color].split(" ")[0]}`}>
            <Text className={`text-xs ${colorMap[color].split(" ")[1]}`}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
