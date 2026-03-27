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
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

import logoImage from "../../assets/images/ecomapeia-logo.png";
import bgImage from "../../assets/images/hidroeletrica-bg.png";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Complexo {
  id: number;
  nome: string;
  descricao: string | null;
}

interface RegisterScreenProps {
  navigation: any;
}

const TIPOS_USUARIO = ["Fiscal", "Técnico", "Coordenador", "Gerente"];

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [tipoUsuario, setTipoUsuario] = useState("Fiscal");
  const [complexoId, setComplexoId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTipoDropdown, setShowTipoDropdown] = useState(false);
  const [showComplexoDropdown, setShowComplexoDropdown] = useState(false);

  const { data: complexos = [], isLoading: loadingComplexos } = useQuery<Complexo[]>({
    queryKey: ["/api/complexos"],
    queryFn: async () => {
      const res = await fetch(new URL("/api/complexos", getApiUrl()).toString());
      if (!res.ok) throw new Error("Erro ao carregar complexos");
      return res.json();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: {
      nome: string;
      email: string;
      senha: string;
      tipo_usuario: string;
      complexo_id?: number;
    }) => {
      const res = await fetch(new URL("/api/auth/register", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao criar conta");
      return json;
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate("Login", { registered: true });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Erro ao criar conta");
    },
  });

  const handleRegister = async () => {
    setError(null);
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem");
      return;
    }
    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (!complexoId && tipoUsuario !== "Coordenador") {
      setError("Selecione o complexo ao qual você está designado");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    registerMutation.mutate({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha,
      tipo_usuario: tipoUsuario,
      complexo_id: complexoId ?? undefined,
    });
  };

  const selectedComplexo = complexos.find((c) => c.id === complexoId);

  return (
    <ImageBackground source={bgImage} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoSection}>
            <Image source={logoImage} style={styles.logoImage} contentFit="contain" />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.formCard}>
            <ThemedText style={styles.formTitle} lightColor="#1E3A5F" darkColor="#1E3A5F">
              Criar conta
            </ThemedText>
            <ThemedText style={styles.formSubtitle} lightColor="#6B7280" darkColor="#6B7280">
              Preencha os dados para solicitar acesso
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                Nome completo *
              </ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Seu nome completo"
                  placeholderTextColor="#9CA3AF"
                  value={nome}
                  onChangeText={setNome}
                  autoCapitalize="words"
                  testID="input-nome"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                E-mail *
              </ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="seu@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                Senha *
              </ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="input-senha"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                Confirmar senha *
              </ThemedText>
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repita sua senha"
                  placeholderTextColor="#9CA3AF"
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  testID="input-confirmar-senha"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeButton}
                >
                  <Feather name={showConfirmPassword ? "eye-off" : "eye"} size={18} color="#9CA3AF" />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                Cargo / Função *
              </ThemedText>
              <Pressable
                style={styles.inputContainer}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowTipoDropdown(!showTipoDropdown);
                  setShowComplexoDropdown(false);
                }}
              >
                <Feather name="briefcase" size={18} color="#9CA3AF" style={styles.inputIcon} />
                <ThemedText style={styles.dropdownText} lightColor="#1F2937" darkColor="#1F2937">
                  {tipoUsuario}
                </ThemedText>
                <Feather name="chevron-down" size={18} color="#9CA3AF" />
              </Pressable>
              {showTipoDropdown ? (
                <View style={styles.dropdown}>
                  {TIPOS_USUARIO.map((tipo) => (
                    <Pressable
                      key={tipo}
                      style={[styles.dropdownItem, tipoUsuario === tipo && styles.dropdownItemActive]}
                      onPress={() => {
                        setTipoUsuario(tipo);
                        setShowTipoDropdown(false);
                        if (tipo === "Coordenador") setComplexoId(null);
                        Haptics.selectionAsync();
                      }}
                    >
                      <ThemedText
                        style={styles.dropdownItemText}
                        lightColor={tipoUsuario === tipo ? "#1A7A52" : "#374151"}
                        darkColor={tipoUsuario === tipo ? "#1A7A52" : "#374151"}
                      >
                        {tipo}
                      </ThemedText>
                      {tipoUsuario === tipo ? (
                        <Feather name="check" size={16} color="#1A7A52" />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {tipoUsuario !== "Coordenador" ? (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel} lightColor="#374151" darkColor="#374151">
                  Complexo hidrelétrico *
                </ThemedText>
                <Pressable
                  style={[styles.inputContainer, !complexoId && styles.inputContainerRequired]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setShowComplexoDropdown(!showComplexoDropdown);
                    setShowTipoDropdown(false);
                  }}
                >
                  <Feather name="zap" size={18} color={complexoId ? "#1A7A52" : "#9CA3AF"} style={styles.inputIcon} />
                  <ThemedText
                    style={styles.dropdownText}
                    lightColor={complexoId ? "#1F2937" : "#9CA3AF"}
                    darkColor={complexoId ? "#1F2937" : "#9CA3AF"}
                  >
                    {loadingComplexos
                      ? "Carregando..."
                      : selectedComplexo
                      ? selectedComplexo.nome
                      : "Selecione o complexo"}
                  </ThemedText>
                  <Feather name="chevron-down" size={18} color="#9CA3AF" />
                </Pressable>
                {showComplexoDropdown ? (
                  <View style={styles.dropdown}>
                    {complexos.map((complexo) => (
                      <Pressable
                        key={complexo.id}
                        style={[
                          styles.dropdownItem,
                          complexoId === complexo.id && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setComplexoId(complexo.id);
                          setShowComplexoDropdown(false);
                          Haptics.selectionAsync();
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            style={[styles.dropdownItemText, { fontWeight: "600" }]}
                            lightColor={complexoId === complexo.id ? "#1A7A52" : "#374151"}
                            darkColor={complexoId === complexo.id ? "#1A7A52" : "#374151"}
                          >
                            {complexo.nome}
                          </ThemedText>
                          {complexo.descricao ? (
                            <ThemedText
                              style={styles.dropdownItemSubtext}
                              lightColor="#9CA3AF"
                              darkColor="#9CA3AF"
                            >
                              {complexo.descricao}
                            </ThemedText>
                          ) : null}
                        </View>
                        {complexoId === complexo.id ? (
                          <Feather name="check" size={16} color="#1A7A52" />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            {error ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <ThemedText style={styles.errorText} lightColor="#EF4444" darkColor="#EF4444">
                  {error}
                </ThemedText>
              </Animated.View>
            ) : null}

            <Pressable
              style={[styles.registerButton, registerMutation.isPending && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={registerMutation.isPending}
              testID="button-register"
            >
              <View style={styles.registerButtonInner}>
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <ThemedText style={styles.registerButtonText} lightColor="#FFFFFF" darkColor="#FFFFFF">
                      Criar conta
                    </ThemedText>
                    <Feather name="user-plus" size={20} color="#FFFFFF" />
                  </>
                )}
              </View>
            </Pressable>

            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Feather name="arrow-left" size={16} color="#1A7A52" />
              <ThemedText style={styles.backButtonText} lightColor="#1A7A52" darkColor="#1A7A52">
                Voltar ao login
              </ThemedText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 30, 15, 0.55)",
  },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoImage: {
    width: Math.min(SCREEN_WIDTH - 40, 280),
    height: 120,
  },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.97)",
    borderRadius: 24,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: Spacing.xl,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.md,
    position: "relative",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 50,
  },
  inputContainerRequired: {
    borderColor: "#FCA5A5",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1F2937",
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemActive: {
    backgroundColor: "#F0FDF4",
  },
  dropdownItemText: {
    fontSize: 14,
    flex: 1,
  },
  dropdownItemSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  registerButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonInner: {
    backgroundColor: "#1A7A52",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
