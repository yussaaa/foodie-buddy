import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/authStore";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
}: {
  name: IoniconsName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={name}
      size={24}
      color={focused ? "#f97316" : "#71717a"}
    />
  );
}

export default function TabsLayout() {
  const language = useAuthStore((s) => s.language);
  const zh = language === "zh";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopColor: "#2a2a2a",
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: "#f97316",
        tabBarInactiveTintColor: "#71717a",
        tabBarLabelStyle: { fontSize: 11, marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: zh ? "探索" : "Explore",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "search" : "search-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: zh ? "地图" : "Map",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "map" : "map-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: zh ? "已保存" : "Saved",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "heart" : "heart-outline"} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: zh ? "我的" : "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
