import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
  ImageBackground,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

import logoImage from "../../assets/images/ecomapeia-logo-transparent.png";
import bgImage from "../../assets/images/hidroeletrica-bg.png";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login, isLoading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [senhaFocused, setSenhaFocused] = useState(false);

  const buttonScale = useSharedValue(1);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await login(email.trim(), senha);
  };

  const togglePasswordVisibility = () => {
    Haptics.selectionAsync();
    setShowPassword(!showPassword);
  };

  return (
    <ImageBackground source={bgImage} style={styles.gradient} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing["2xl"],
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.logoSection}
          >
            <View style={styles.logoContainer}>
              <Image
                source={logoImage}
                style={styles.logoImage}
                contentFit="contain"
              />
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(600).delay(300)}
            style={styles.formCard}
          >
            <ThemedText style={styles.formTitle} lightColor="#1E3A5F" darkColor="#1E3A5F">
              Acesse sua conta
            </ThemedText>
            <ThemedText style={styles.formSubtitle} lightColor="#6B7280" darkColor="#6B7280">
              Entre com suas credenciais para continuar
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                E-mail
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  emailFocused && styles.inputContainerFocused,
                ]}
              >
                <Feather
                  name="mail"
                  size={18}
                  color={emailFocused ? "#1A7A52" : "#9CA3AF"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                Senha
              </ThemedText>
              <View
                style={[
                  styles.inputContainer,
                  senhaFocused && styles.inputContainerFocused,
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={senhaFocused ? "#1A7A52" : "#9CA3AF"}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Digite sua senha"
                  placeholderTextColor="#9CA3AF"
                  value={senha}
                  onChangeText={setSenha}
                  onFocus={() => setSenhaFocused(true)}
                  onBlur={() => setSenhaFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="input-password"
                />
                <Pressable
                  onPress={togglePasswordVisibility}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            {error ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <ThemedText style={styles.errorText} lightColor="#EF4444" darkColor="#EF4444">
                  {error}
                </ThemedText>
              </Animated.View>
            ) : null}

            <AnimatedPressable
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              style={[styles.loginButton, buttonAnimatedStyle]}
              testID="button-login"
            >
              <View style={styles.loginButtonGradient}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText style={styles.loginButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                      Entrar
                    </ThemedText>
                    <Feather name="arrow-right" size={20} color="#FFFFFF" />
                  </>
                )}
              </View>
            </AnimatedPressable>

            <Pressable style={styles.forgotButton}>
              <ThemedText
                style={styles.forgotText}
                lightColor="#1A7A52"
                darkColor="#1A7A52"
              >
                Esqueceu sua senha?
              </ThemedText>
            </Pressable>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(800).delay(600)}
            style={styles.footerContainer}
          >
            <ThemedText style={styles.footerText} lightColor="rgba(255,255,255,0.5)" darkColor="rgba(255,255,255,0.5)">
              desenvolvido por
            </ThemedText>
            <ThemedText style={styles.footerCompany} lightColor="rgba(255,255,255,0.8)" darkColor="rgba(255,255,255,0.8)">
              Maurivan Vaz Ribeiro
            </ThemedText>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 30, 15, 0.55)",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  logoContainer: {
    width: Math.min(SCREEN_WIDTH - 20, 450),
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing["2xl"],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: Spacing["2xl"],
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    height: 52,
    paddingHorizontal: Spacing.md,
  },
  inputContainerFocused: {
    borderColor: "#1A7A52",
    backgroundColor: "#F0FDF4",
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: "#1F2937",
    fontSize: 15,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  loginButton: {
    marginTop: Spacing.sm,
    borderRadius: 12,
    overflow: "hidden",
  },
  loginButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    gap: Spacing.sm,
    backgroundColor: "#1A7A52",
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  forgotButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "500",
  },
  footerContainer: {
    alignItems: "center",
    paddingBottom: Spacing.md,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 2,
  },
  footerCompany: {
    fontSize: 13,
    fontWeight: "600",
  },
});
