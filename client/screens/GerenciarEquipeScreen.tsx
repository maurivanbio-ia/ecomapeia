import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, TextInput, Modal, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo_usuario: string;
  is_admin: boolean;
  projeto_atual_id: number | null;
}

export default function GerenciarEquipeScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    tipo_usuario: "Fiscal",
    is_admin: false,
  });

  const { data: tenantData } = useQuery({
    queryKey: ["/api/tenant/usuarios", user?.id, "tenant"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/usuarios/${user?.id}/tenant`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch tenant data");
      return response.json();
    },
    enabled: !!user?.id,
  });

  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ["/api/tenant/empresas", tenantData?.empresa?.id, "usuarios"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/empresas/${tenantData?.empresa?.id}/usuarios`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!tenantData?.empresa?.id,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(
        new URL("/api/tenant/usuarios/invite", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            empresa_id: tenantData?.empresa?.id,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to invite user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/empresas"] });
      setModalVisible(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", "Usuário convidado com sucesso!");
    },
    onError: (error: Error) => {
      Alert.alert("Erro", error.message);
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      const response = await fetch(
        new URL(`/api/tenant/usuarios/${userId}/admin`, getApiUrl()).toString(),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_admin: isAdmin }),
        }
      );
      if (!response.ok) throw new Error("Failed to update admin status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/empresas"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      tipo_usuario: "Fiscal",
      is_admin: false,
    });
  };

  const handleInvite = () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      Alert.alert("Erro", "Nome e email são obrigatórios");
      return;
    }
    inviteMutation.mutate(formData);
  };

  const tiposUsuario = ["Fiscal", "Técnico", "Coordenador", "Gerente"];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <ThemedText style={styles.title}>Equipe da Empresa</ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: Colors.light.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Feather name="user-plus" size={20} color="#fff" />
            <ThemedText style={styles.addButtonText}>Convidar</ThemedText>
          </Pressable>
        </Animated.View>

        {usuarios.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.emptyState}>
            <Feather name="users" size={48} color={theme.tabIconDefault} />
            <ThemedText style={[styles.emptyText, { color: theme.tabIconDefault }]}>
              Nenhum usuário na equipe
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.tabIconDefault }]}>
              Convide membros para sua equipe
            </ThemedText>
          </Animated.View>
        ) : (
          usuarios.map((usuario: Usuario, index: number) => (
            <Animated.View
              key={usuario.id}
              entering={FadeInDown.duration(400).delay(100 + index * 50)}
            >
              <View style={[styles.userCard, { backgroundColor: theme.backgroundDefault }]}>
                <View style={styles.userHeader}>
                  <View style={[styles.userAvatar, { backgroundColor: Colors.light.accent }]}>
                    <ThemedText style={styles.avatarText}>
                      {usuario.nome.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.userInfo}>
                    <ThemedText style={styles.userName}>{usuario.nome}</ThemedText>
                    <ThemedText style={[styles.userEmail, { color: theme.tabIconDefault }]}>
                      {usuario.email}
                    </ThemedText>
                  </View>
                  {usuario.is_admin ? (
                    <View style={[styles.adminBadge, { backgroundColor: "#8b5cf620" }]}>
                      <Feather name="shield" size={14} color="#8b5cf6" />
                      <ThemedText style={[styles.adminText, { color: "#8b5cf6" }]}>
                        Admin
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
                <View style={styles.userFooter}>
                  <View style={[styles.tipoBadge, { backgroundColor: theme.border }]}>
                    <ThemedText style={[styles.tipoText, { color: theme.text }]}>
                      {usuario.tipo_usuario}
                    </ThemedText>
                  </View>
                  {usuario.id !== user?.id ? (
                    <Pressable
                      style={[styles.actionButton, { borderColor: theme.border }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        toggleAdminMutation.mutate({
                          userId: usuario.id,
                          isAdmin: !usuario.is_admin,
                        });
                      }}
                    >
                      <Feather
                        name={usuario.is_admin ? "user-minus" : "user-check"}
                        size={16}
                        color={theme.text}
                      />
                      <ThemedText style={styles.actionText}>
                        {usuario.is_admin ? "Remover Admin" : "Tornar Admin"}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Convidar Usuário</ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.inputLabel}>Nome *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.nome}
                onChangeText={(text) => setFormData({ ...formData, nome: text })}
                placeholder="Nome completo"
                placeholderTextColor={theme.tabIconDefault}
              />

              <ThemedText style={styles.inputLabel}>Email *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="email@exemplo.com"
                placeholderTextColor={theme.tabIconDefault}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText style={styles.inputLabel}>Tipo de Usuário</ThemedText>
              <View style={styles.tipoGrid}>
                {tiposUsuario.map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[
                      styles.tipoOption,
                      { borderColor: theme.border },
                      formData.tipo_usuario === tipo && { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
                    ]}
                    onPress={() => setFormData({ ...formData, tipo_usuario: tipo })}
                  >
                    <ThemedText
                      style={[
                        styles.tipoOptionText,
                        formData.tipo_usuario === tipo && { color: "#fff" },
                      ]}
                    >
                      {tipo}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <Pressable
                style={styles.adminToggle}
                onPress={() => setFormData({ ...formData, is_admin: !formData.is_admin })}
              >
                <View style={[styles.checkbox, { borderColor: theme.border }, formData.is_admin && { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary }]}>
                  {formData.is_admin ? <Feather name="check" size={14} color="#fff" /> : null}
                </View>
                <ThemedText style={styles.adminToggleText}>
                  Definir como administrador da empresa
                </ThemedText>
              </Pressable>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.saveButton, { backgroundColor: Colors.light.primary }]}
                onPress={handleInvite}
                disabled={inviteMutation.isPending}
              >
                <ThemedText style={styles.saveButtonText}>
                  {inviteMutation.isPending ? "Convidando..." : "Convidar"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  userCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  adminText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  tipoBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tipoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalForm: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  tipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  tipoOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  tipoOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  adminToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  adminToggleText: {
    fontSize: 14,
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  saveButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
