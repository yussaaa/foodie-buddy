import "../global.css";
import { useEffect } from "react";
import { Stack, router, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/store/authStore";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)/explore");
    }
  }, [user, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initialize().then((fn) => {
      unsubscribe = fn;
    });
    return () => unsubscribe?.();
  }, [initialize]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="restaurant/[id]"
            options={{
              presentation: "modal",
              headerShown: true,
              headerStyle: { backgroundColor: "#1a1a1a" },
              headerTintColor: "#fff",
              headerTitle: "",
            }}
          />
        </Stack>
      </AuthGuard>
    </GestureHandlerRootView>
  );
}
