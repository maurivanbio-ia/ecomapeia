import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    <ImageBackground
      source={require("../../assets/images/login-background.png")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: insets.top + Spacing["3xl"],
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          {/* Login Form at Top */}
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={styles.formContainer}
          >
            <ThemedText
              style={styles.welcomeText}
              lightColor="#FFFFFF"
              darkColor="#FFFFFF"
            >
              Bem-vindo ao
            </ThemedText>
            
            {/* MapeIA with colors */}
            <View style={styles.logoTextContainer}>
              <Text style={styles.logoTextBlue}>Mape</Text>
              <Text style={styles.logoTextGreen}>IA</Text>
            </View>
            
            <ThemedText
              style={styles.subtitleText}
              lightColor="rgba(255,255,255,0.8)"
              darkColor="rgba(255,255,255,0.8)"
            >
              Plataforma de Vistorias Ambientais
            </ThemedText>

            {/* Email Input */}
            <View
              style={[
                styles.inputContainer,
                emailFocused && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="mail"
                size={20}
                color={emailFocused ? Colors.light.accent : "rgba(255,255,255,0.6)"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="rgba(255,255,255,0.5)"
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

            {/* Password Input */}
            <View
              style={[
                styles.inputContainer,
                senhaFocused && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="lock"
                size={20}
                color={senhaFocused ? Colors.light.accent : "rgba(255,255,255,0.6)"}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="rgba(255,255,255,0.5)"
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
                  size={20}
                  color="rgba(255,255,255,0.6)"
                />
              </Pressable>
            </View>

            {/* Error Message */}
            {error ? (
              <Animated.View entering={FadeIn.duration(300)}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </Animated.View>
            ) : null}

            {/* Login Button */}
            <AnimatedPressable
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              style={[styles.loginButton, buttonAnimatedStyle]}
              testID="button-login"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <ThemedText style={styles.loginButtonText}>
                  Faça seu login
                </ThemedText>
              )}
            </AnimatedPressable>

            {/* Forgot Password */}
            <Pressable style={styles.forgotButton}>
              <ThemedText
                style={styles.forgotText}
                lightColor="rgba(255,255,255,0.8)"
                darkColor="rgba(255,255,255,0.8)"
              >
                Esqueci minha senha
              </ThemedText>
            </Pressable>
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Footer */}
          <Animated.View
            entering={FadeIn.duration(800).delay(600)}
            style={styles.footerContainer}
          >
            <ThemedText
              style={styles.footerText}
              lightColor="rgba(255,255,255,0.6)"
              darkColor="rgba(255,255,255,0.6)"
            >
              desenvolvido por
            </ThemedText>
            <ThemedText
              style={styles.footerCompany}
              lightColor="rgba(255,255,255,0.8)"
              darkColor="rgba(255,255,255,0.8)"
            >
              EcoIA - Inteligência Ambiental
            </ThemedText>
            <ThemedText
              style={styles.footerCnpj}
              lightColor="rgba(255,255,255,0.5)"
              darkColor="rgba(255,255,255,0.5)"
            >
              por Maurivan Vaz Ribeiro
            </ThemedText>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(30, 58, 95, 0.55)",
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing["2xl"],
    justifyContent: "space-between",
  },
  formContainer: {
    width: "100%",
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  logoTextContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  logoTextBlue: {
    fontSize: 48,
    fontWeight: "800",
    color: "#1E3A5F",
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  logoTextGreen: {
    fontSize: 48,
    fontWeight: "800",
    color: "#8DC63F",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: Spacing["3xl"],
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: Spacing.lg,
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
  },
  inputContainerFocused: {
    borderColor: Colors.light.accent,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  errorText: {
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.light.accent,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  forgotButton: {
    marginTop: Spacing.xl,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  spacer: {
    flex: 1,
  },
  footerContainer: {
    alignItems: "center",
    paddingBottom: Spacing.md,
  },
  footerText: {
    fontSize: 12,
    marginBottom: Spacing.xs,
  },
  footerCompany: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  footerCnpj: {
    fontSize: 11,
  },
});
