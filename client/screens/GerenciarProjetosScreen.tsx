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

interface Projeto {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  reservatorio: string | null;
  rio_principal: string | null;
  municipios: string | null;
  ativo: boolean;
}

export default function GerenciarProjetosScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Projeto | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    codigo: "",
    descricao: "",
    reservatorio: "",
    rio_principal: "",
    municipios: "",
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

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(
        new URL("/api/tenant/projetos", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            empresa_id: tenantData?.empresa?.id,
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to create project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/usuarios"] });
      setModalVisible(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await fetch(
        new URL(`/api/tenant/projetos/${id}`, getApiUrl()).toString(),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Failed to update project");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/usuarios"] });
      setModalVisible(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      codigo: "",
      descricao: "",
      reservatorio: "",
      rio_principal: "",
      municipios: "",
    });
    setEditingProjeto(null);
  };

  const handleOpenModal = (projeto?: Projeto) => {
    if (projeto) {
      setEditingProjeto(projeto);
      setFormData({
        nome: projeto.nome,
        codigo: projeto.codigo || "",
        descricao: projeto.descricao || "",
        reservatorio: projeto.reservatorio || "",
        rio_principal: projeto.rio_principal || "",
        municipios: projeto.municipios || "",
      });
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      Alert.alert("Erro", "O nome do projeto é obrigatório");
      return;
    }

    if (editingProjeto) {
      updateMutation.mutate({ id: editingProjeto.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const projetos = tenantData?.projetosDisponiveis || [];

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
          <ThemedText style={styles.title}>Projetos da Empresa</ThemedText>
          <Pressable
            style={[styles.addButton, { backgroundColor: Colors.light.primary }]}
            onPress={() => handleOpenModal()}
          >
            <Feather name="plus" size={20} color="#fff" />
            <ThemedText style={styles.addButtonText}>Novo Projeto</ThemedText>
          </Pressable>
        </Animated.View>

        {projetos.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.emptyState}>
            <Feather name="folder" size={48} color={theme.tabIconDefault} />
            <ThemedText style={[styles.emptyText, { color: theme.tabIconDefault }]}>
              Nenhum projeto cadastrado
            </ThemedText>
            <ThemedText style={[styles.emptySubtext, { color: theme.tabIconDefault }]}>
              Clique em "Novo Projeto" para começar
            </ThemedText>
          </Animated.View>
        ) : (
          projetos.map((projeto: Projeto, index: number) => (
            <Animated.View
              key={projeto.id}
              entering={FadeInDown.duration(400).delay(100 + index * 50)}
            >
              <Pressable
                style={[styles.projetoCard, { backgroundColor: theme.backgroundDefault }]}
                onPress={() => handleOpenModal(projeto)}
              >
                <View style={styles.projetoHeader}>
                  <View style={[styles.projetoIcon, { backgroundColor: Colors.light.primary + "15" }]}>
                    <Feather name="folder" size={20} color={Colors.light.primary} />
                  </View>
                  <View style={styles.projetoInfo}>
                    <ThemedText style={styles.projetoNome}>{projeto.nome}</ThemedText>
                    {projeto.codigo ? (
                      <ThemedText style={[styles.projetoCodigo, { color: theme.tabIconDefault }]}>
                        {projeto.codigo}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: projeto.ativo ? "#22c55e20" : "#ef444420" }]}>
                    <ThemedText style={[styles.statusText, { color: projeto.ativo ? "#22c55e" : "#ef4444" }]}>
                      {projeto.ativo ? "Ativo" : "Inativo"}
                    </ThemedText>
                  </View>
                </View>
                {projeto.reservatorio ? (
                  <View style={styles.projetoDetails}>
                    <Feather name="droplet" size={14} color={theme.tabIconDefault} />
                    <ThemedText style={[styles.detailText, { color: theme.tabIconDefault }]}>
                      {projeto.reservatorio}
                    </ThemedText>
                  </View>
                ) : null}
                {projeto.municipios ? (
                  <View style={styles.projetoDetails}>
                    <Feather name="map-pin" size={14} color={theme.tabIconDefault} />
                    <ThemedText style={[styles.detailText, { color: theme.tabIconDefault }]} numberOfLines={1}>
                      {projeto.municipios}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {editingProjeto ? "Editar Projeto" : "Novo Projeto"}
              </ThemedText>
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
                placeholder="Ex: UHE Itupararanga"
                placeholderTextColor={theme.tabIconDefault}
              />

              <ThemedText style={styles.inputLabel}>Código</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.codigo}
                onChangeText={(text) => setFormData({ ...formData, codigo: text })}
                placeholder="Ex: UHE-ITP"
                placeholderTextColor={theme.tabIconDefault}
              />

              <ThemedText style={styles.inputLabel}>Descrição</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.descricao}
                onChangeText={(text) => setFormData({ ...formData, descricao: text })}
                placeholder="Descrição do projeto"
                placeholderTextColor={theme.tabIconDefault}
                multiline
                numberOfLines={3}
              />

              <ThemedText style={styles.inputLabel}>Reservatório</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.reservatorio}
                onChangeText={(text) => setFormData({ ...formData, reservatorio: text })}
                placeholder="Nome do reservatório"
                placeholderTextColor={theme.tabIconDefault}
              />

              <ThemedText style={styles.inputLabel}>Rio Principal</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.rio_principal}
                onChangeText={(text) => setFormData({ ...formData, rio_principal: text })}
                placeholder="Ex: Rio Sorocaba"
                placeholderTextColor={theme.tabIconDefault}
              />

              <ThemedText style={styles.inputLabel}>Municípios</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, color: theme.text }]}
                value={formData.municipios}
                onChangeText={(text) => setFormData({ ...formData, municipios: text })}
                placeholder="Ex: Ibiúna, Piedade, São Roque"
                placeholderTextColor={theme.tabIconDefault}
              />
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
                onPress={handleSave}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ThemedText style={styles.saveButtonText}>
                  {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
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
  projetoCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  projetoHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  projetoIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  projetoInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  projetoNome: {
    fontSize: 16,
    fontWeight: "600",
  },
  projetoCodigo: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  projetoDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    marginLeft: 52,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
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
    maxHeight: "90%",
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
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
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
