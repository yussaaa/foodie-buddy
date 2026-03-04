import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";
import { useRestaurantStore } from "@/store/restaurantStore";

export default function ProfileScreen() {
  const { user, language, setLanguage, signOut } = useAuthStore();
  const restaurants = useRestaurantStore((s) => s.restaurants);
  const zh = language === "zh";

  const visitedCount = restaurants.filter((r) => r.is_visited).length;
  const wishlistCount = restaurants.filter((r) => r.is_wishlist && !r.is_visited).length;

  async function handleSignOut() {
    Alert.alert(
      zh ? "退出登录" : "Sign out",
      zh ? "确定要退出吗？" : "Are you sure you want to sign out?",
      [
        { text: zh ? "取消" : "Cancel", style: "cancel" },
        {
          text: zh ? "退出" : "Sign out",
          style: "destructive",
          onPress: signOut,
        },
      ]
    );
  }

  const displayName =
    user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";

  return (
    <SafeAreaView className="flex-1 bg-[#0a0a0a]">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View className="px-4 pt-4 pb-3">
          <Text className="text-white text-2xl font-bold">
            {zh ? "我的" : "Profile"}
          </Text>
        </View>

        {/* User card */}
        <View className="mx-4 bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 bg-orange-500/20 rounded-full items-center justify-center">
              <Text className="text-3xl">
                {displayName[0]?.toUpperCase() ?? "U"}
              </Text>
            </View>
            <View>
              <Text className="text-white font-semibold text-lg">{displayName}</Text>
              <Text className="text-zinc-400 text-sm">{user?.email}</Text>
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row mt-4 pt-4 border-t border-zinc-800 gap-6">
            <View className="items-center">
              <Text className="text-orange-400 text-2xl font-bold">
                {restaurants.length}
              </Text>
              <Text className="text-zinc-400 text-xs mt-0.5">
                {zh ? "已保存" : "Saved"}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-green-400 text-2xl font-bold">{visitedCount}</Text>
              <Text className="text-zinc-400 text-xs mt-0.5">
                {zh ? "已打卡" : "Visited"}
              </Text>
            </View>
            <View className="items-center">
              <Text className="text-yellow-400 text-2xl font-bold">{wishlistCount}</Text>
              <Text className="text-zinc-400 text-xs mt-0.5">
                {zh ? "心愿单" : "Wishlist"}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View className="mx-4 mt-4 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
          {/* Language toggle */}
          <View className="flex-row items-center justify-between px-4 py-4 border-b border-zinc-800">
            <View className="flex-row items-center gap-3">
              <Ionicons name="language-outline" size={20} color="#71717a" />
              <Text className="text-white text-base">
                {zh ? "语言" : "Language"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setLanguage(zh ? "en" : "zh")}
              className="flex-row items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full"
            >
              <Text className="text-zinc-300 text-sm font-medium">
                {zh ? "中文" : "English"}
              </Text>
              <Ionicons name="swap-horizontal" size={14} color="#71717a" />
            </TouchableOpacity>
          </View>

          {/* App version */}
          <View className="flex-row items-center justify-between px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="information-circle-outline" size={20} color="#71717a" />
              <Text className="text-white text-base">
                {zh ? "版本" : "Version"}
              </Text>
            </View>
            <Text className="text-zinc-500 text-sm">1.0.0</Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="mx-4 mt-4 bg-zinc-900 rounded-2xl p-4 border border-zinc-800 flex-row items-center gap-3 active:opacity-70"
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text className="text-red-400 text-base font-medium">
            {zh ? "退出登录" : "Sign out"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
