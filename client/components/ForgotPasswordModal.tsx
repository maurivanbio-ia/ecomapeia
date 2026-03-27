import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type Step = "email" | "code" | "password" | "success";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ visible, onClose }: Props) {
  const { theme } = useTheme();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
    onClose();
  };

  const sendCode = async () => {
    if (!email.trim()) return setError("Informe seu e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("E-mail inválido.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(new URL("/api/auth/forgot-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao enviar código.");
      setStep("code");
    } catch (err: any) {
      setError(err.message || "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) return setError("Digite o código de 6 dígitos.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(new URL("/api/auth/verify-reset-code", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Código inválido.");
      setStep("password");
    } catch (err: any) {
      setError(err.message || "Código inválido ou expirado.");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 6) return setError("A senha deve ter no mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return setError("As senhas não coincidem.");
    setError("");
    setLoading(true);
    try {
      const res = await fetch(new URL("/api/auth/reset-password", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao redefinir senha.");
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: { icon: "mail" as const, title: "Esqueceu sua senha?", subtitle: "Informe seu e-mail cadastrado e enviaremos um código de verificação." },
    code: { icon: "shield" as const, title: "Código de verificação", subtitle: `Enviamos um código de 6 dígitos para\n${email}` },
    password: { icon: "lock" as const, title: "Nova senha", subtitle: "Crie uma nova senha segura para sua conta." },
    success: { icon: "check-circle" as const, title: "Senha redefinida!", subtitle: "Sua senha foi alterada com sucesso. Você já pode fazer login." },
  };

  const cfg = stepConfig[step];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: Colors.light.accent + "22" }]}>
                <Feather name={cfg.icon} size={26} color={Colors.light.accent} />
              </View>
              <Pressable style={styles.closeBtn} onPress={handleClose}>
                <Feather name="x" size={20} color={theme.tabIconDefault} />
              </Pressable>
            </View>

            <ThemedText style={styles.title}>{cfg.title}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: theme.tabIconDefault }]}>{cfg.subtitle}</ThemedText>

            {/* Step: Email */}
            {step === "email" && (
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.backgroundElevated }]}>
                  <Feather name="mail" size={16} color={theme.tabIconDefault} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="seu@email.com"
                    placeholderTextColor={theme.tabIconDefault}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={sendCode}
                    returnKeyType="send"
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.light.accent }, loading && styles.btnDisabled]}
                  onPress={sendCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ThemedText style={styles.btnText} lightColor="#fff" darkColor="#fff">Enviar código</ThemedText>
                      <Feather name="send" size={16} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Step: Code */}
            {step === "code" && (
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: code.length === 6 ? Colors.light.accent : theme.border, backgroundColor: theme.backgroundElevated }]}>
                  <Feather name="hash" size={16} color={theme.tabIconDefault} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.codeInput, { color: theme.text }]}
                    placeholder="000000"
                    placeholderTextColor={theme.tabIconDefault}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={code}
                    onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ""))}
                    onSubmitEditing={verifyCode}
                    returnKeyType="done"
                    autoFocus
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.light.accent }, loading && styles.btnDisabled]}
                  onPress={verifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ThemedText style={styles.btnText} lightColor="#fff" darkColor="#fff">Verificar código</ThemedText>
                      <Feather name="arrow-right" size={16} color="#fff" />
                    </>
                  )}
                </Pressable>
                <Pressable style={styles.resendBtn} onPress={() => { setStep("email"); setCode(""); setError(""); }}>
                  <ThemedText style={[styles.resendText, { color: Colors.light.accent }]}>Reenviar código</ThemedText>
                </Pressable>
              </View>
            )}

            {/* Step: New Password */}
            {step === "password" && (
              <View style={styles.form}>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.backgroundElevated }]}>
                  <Feather name="lock" size={16} color={theme.tabIconDefault} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    placeholderTextColor={theme.tabIconDefault}
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    returnKeyType="next"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Feather name={showPassword ? "eye-off" : "eye"} size={16} color={theme.tabIconDefault} />
                  </Pressable>
                </View>
                <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.backgroundElevated }]}>
                  <Feather name="lock" size={16} color={theme.tabIconDefault} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirmar nova senha"
                    placeholderTextColor={theme.tabIconDefault}
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onSubmitEditing={resetPassword}
                    returnKeyType="done"
                  />
                </View>
                {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.light.accent }, loading && styles.btnDisabled]}
                  onPress={resetPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <ThemedText style={styles.btnText} lightColor="#fff" darkColor="#fff">Redefinir senha</ThemedText>
                      <Feather name="check" size={16} color="#fff" />
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <View style={styles.form}>
                <Pressable
                  style={[styles.btn, { backgroundColor: Colors.light.accent }]}
                  onPress={handleClose}
                >
                  <ThemedText style={styles.btnText} lightColor="#fff" darkColor="#fff">Fazer login agora</ThemedText>
                  <Feather name="log-in" size={16} color="#fff" />
                </Pressable>
              </View>
            )}

            {/* Step indicator */}
            {step !== "success" && (
              <View style={styles.stepRow}>
                {(["email", "code", "password"] as Step[]).map((s, i) => (
                  <View
                    key={s}
                    style={[
                      styles.stepDot,
                      {
                        backgroundColor:
                          step === s
                            ? Colors.light.accent
                            : (["email", "code", "password"].indexOf(step) > i
                              ? Colors.light.accent + "88"
                              : theme.border),
                      },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  scrollContent: { flexGrow: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, paddingVertical: 40 },
  card: { width: "100%", maxWidth: 400, borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  iconCircle: { width: 52, height: 52, borderRadius: 26, justifyContent: "center", alignItems: "center" },
  closeBtn: { padding: 6 },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 13.5, lineHeight: 20, marginBottom: 24 },
  form: { gap: 12 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15 },
  codeInput: { flex: 1, fontSize: 28, fontWeight: "700", letterSpacing: 8, textAlign: "center" },
  eyeBtn: { padding: 4 },
  error: { color: "#dc2626", fontSize: 13, marginTop: -4 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, height: 50, marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontWeight: "600" },
  resendBtn: { alignItems: "center", paddingVertical: 8 },
  resendText: { fontSize: 14, fontWeight: "500" },
  stepRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 20 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
});
