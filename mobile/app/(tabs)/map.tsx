import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRestaurantStore } from "@/store/restaurantStore";
import { useAuthStore } from "@/store/authStore";
import type { Restaurant } from "@/types";

// react-native-maps is imported lazily to avoid issues in Expo Go
// Real map implementation requires a custom dev client with Google Maps API key
let MapView: any, Marker: any;
try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  // Will show fallback UI if not available
}

type Filter = "all" | "visited" | "wishlist";

export default function MapScreen() {
  const { restaurants, fetchRestaurants, loading } = useRestaurantStore();
  const language = useAuthStore((s) => s.language);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const zh = language === "zh";

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const withCoords = restaurants.filter(
    (r) => r.lat != null && r.lng != null
  );

  const filtered = withCoords.filter((r) => {
    if (filter === "visited") return r.is_visited;
    if (filter === "wishlist") return r.is_wishlist && !r.is_visited;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: zh ? "全部" : "All" },
    { key: "visited", label: zh ? "已打卡" : "Visited" },
    { key: "wishlist", label: zh ? "心愿单" : "Wishlist" },
  ];

  // Fallback if react-native-maps not available
  if (!MapView) {
    return (
      <SafeAreaView className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
        <Ionicons name="map-outline" size={64} color="#3f3f46" />
        <Text className="text-zinc-400 text-base mt-4 text-center">
          {zh
            ? "地图需要在真机或自定义 Dev Client 中运行"
            : "Map requires a physical device or custom Dev Client"}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-[#0a0a0a]">
      {/* Map */}
      <MapView
        style={{ flex: 1 }}
        provider="google"
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 40.7128,
          longitude: -74.006,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onPress={() => setSelected(null)}
      >
        {filtered.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat!, longitude: r.lng! }}
            pinColor={r.is_visited ? "#22c55e" : "#f97316"}
            onPress={() => setSelected(r)}
          />
        ))}
      </MapView>

      {/* Filter bar (top overlay) */}
      <SafeAreaView
        edges={["top"]}
        className="absolute top-0 left-0 right-0 pointer-events-box-none"
      >
        <View className="flex-row px-4 pt-2 gap-2">
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full border shadow ${
                filter === f.key
                  ? "bg-orange-500 border-orange-500"
                  : "border-zinc-700 bg-zinc-900/90"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === f.key ? "text-white" : "text-zinc-300"
                }`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {/* Selected restaurant card (bottom overlay) */}
      {selected && (
        <View className="absolute bottom-8 left-4 right-4 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-2xl">
          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-3">
              <Text className="text-white font-semibold text-base" numberOfLines={1}>
                {selected.name}
              </Text>
              <Text className="text-orange-400 text-sm mt-0.5">
                {selected.cuisine_type}
              </Text>
              {selected.address && (
                <Text className="text-zinc-400 text-xs mt-1" numberOfLines={1}>
                  {selected.address}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Ionicons name="close" size={20} color="#71717a" />
            </TouchableOpacity>
          </View>
          <View
            className={`mt-2 self-start px-2 py-0.5 rounded-full ${
              selected.is_visited ? "bg-green-900/60" : "bg-orange-900/60"
            }`}
          >
            <Text
              className={`text-xs ${
                selected.is_visited ? "text-green-400" : "text-orange-400"
              }`}
            >
              {selected.is_visited
                ? zh ? "已打卡" : "Visited"
                : zh ? "心愿单" : "Wishlist"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#383838" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
];
