"use client";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useState } from "react";
import { Link, router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const language = useAuthStore((s) => s.language);
  const zh = language === "zh";

  async function handleLogin() {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      Alert.alert(
        zh ? "登录失败" : "Login failed",
        zh ? "邮箱或密码错误，请重试。" : "Incorrect email or password."
      );
    } else {
      router.replace("/(tabs)/explore");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0a0a0a]"
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="mb-10 items-center">
          <Text className="text-5xl mb-2">🍜</Text>
          <Text className="text-white text-3xl font-bold">Foodie Buddy</Text>
          <Text className="text-zinc-400 text-sm mt-1">
            {zh ? "你的私人美食探索伙伴" : "Your personal food discovery companion"}
          </Text>
        </View>

        {/* Form */}
        <View className="gap-3">
          <TextInput
            className="bg-zinc-900 text-white rounded-xl px-4 py-4 text-base border border-zinc-800"
            placeholder={zh ? "邮箱" : "Email"}
            placeholderTextColor="#71717a"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            className="bg-zinc-900 text-white rounded-xl px-4 py-4 text-base border border-zinc-800"
            placeholder={zh ? "密码" : "Password"}
            placeholderTextColor="#71717a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
          />
        </View>

        {/* Login button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="mt-5 bg-orange-500 rounded-xl py-4 items-center active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {zh ? "登录" : "Sign In"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign up link */}
        <View className="mt-5 flex-row justify-center">
          <Text className="text-zinc-400">
            {zh ? "还没有账号？" : "Don't have an account? "}
          </Text>
          <Link href="/(auth)/signup">
            <Text className="text-orange-400 font-medium">
              {zh ? "注册" : "Sign up"}
            </Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
