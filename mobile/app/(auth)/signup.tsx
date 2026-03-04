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

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const language = useAuthStore((s) => s.language);
  const zh = language === "zh";

  async function handleSignup() {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert(zh ? "请填写所有字段" : "Please fill all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert(zh ? "密码至少 6 位" : "Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    setLoading(false);
    if (error) {
      Alert.alert(zh ? "注册失败" : "Sign up failed", error.message);
    } else {
      Alert.alert(
        zh ? "注册成功" : "Success",
        zh
          ? "请检查邮箱确认链接，然后登录。"
          : "Check your email to confirm your account, then sign in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-[#0a0a0a]"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-10 items-center">
          <Text className="text-5xl mb-2">🍜</Text>
          <Text className="text-white text-3xl font-bold">Foodie Buddy</Text>
          <Text className="text-zinc-400 text-sm mt-1">
            {zh ? "创建你的账号" : "Create your account"}
          </Text>
        </View>

        <View className="gap-3">
          <TextInput
            className="bg-zinc-900 text-white rounded-xl px-4 py-4 text-base border border-zinc-800"
            placeholder={zh ? "昵称" : "Display name"}
            placeholderTextColor="#71717a"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
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
            placeholder={zh ? "密码（至少 6 位）" : "Password (min 6 chars)"}
            placeholderTextColor="#71717a"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
        </View>

        <TouchableOpacity
          onPress={handleSignup}
          disabled={loading}
          className="mt-5 bg-orange-500 rounded-xl py-4 items-center active:opacity-80"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-base">
              {zh ? "注册" : "Sign Up"}
            </Text>
          )}
        </TouchableOpacity>

        <View className="mt-5 flex-row justify-center">
          <Text className="text-zinc-400">
            {zh ? "已有账号？" : "Already have an account? "}
          </Text>
          <Link href="/(auth)/login">
            <Text className="text-orange-400 font-medium">
              {zh ? "登录" : "Sign in"}
            </Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
