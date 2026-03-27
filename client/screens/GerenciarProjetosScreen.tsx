import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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

interface Complexo {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  totalUhes: number;
  uhes: Projeto[];
  totalVistorias: number;
  totalUsuarios: number;
}

interface Projeto {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  reservatorio: string | null;
  rio_principal: string | null;
  municipios: string | null;
  ativo: boolean;
  complexo_id: number | null;
}

const emptyForm = {
  nome: "",
  codigo: "",
  descricao: "",
  reservatorio: "",
  rio_principal: "",
  municipios: "",
};

export default function GerenciarProjetosScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingProjeto, setEditingProjeto] = useState<Projeto | null>(null);
  const [selectedComplexoId, setSelectedComplexoId] = useState<number | null>(null);
  const [formComplexoId, setFormComplexoId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [showComplexoDropdown, setShowComplexoDropdown] = useState(false);
  const [expandedComplexo, setExpandedComplexo] = useState<number | null>(null);

  const { data: stats, isLoading } = useQuery<{ complexos: Complexo[]; totais: any }>({
    queryKey: ["/api/complexos/admin/stats"],
    queryFn: async () => {
      const res = await fetch(new URL("/api/complexos/admin/stats", getApiUrl()).toString());
      if (!res.ok) throw new Error("Erro ao carregar dados");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm & { complexo_id: number }) => {
      const res = await fetch(
        new URL(`/api/complexos/${data.complexo_id}/uhes`, getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, empresa_id: user?.empresa_id }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar projeto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complexos/admin/stats"] });
      setModalVisible(false);
      resetForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (Platform.OS === "web") {
        window.alert(err.message);
      } else {
        Alert.alert("Erro", err.message);
      }
    },
  });

  const resetForm = () => {
    setFormData(emptyForm);
    setFormComplexoId(null);
    setEditingProjeto(null);
  };

  const handleOpenModal = (complexoId?: number, projeto?: Projeto) => {
    if (projeto) {
      setEditingProjeto(projeto);
      setFormComplexoId(projeto.complexo_id);
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
      if (complexoId) setFormComplexoId(complexoId);
    }
    setModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSave = () => {
    if (!formData.nome.trim()) {
      if (Platform.OS === "web") {
        window.alert("O nome do projeto/UHE é obrigatório");
      } else {
        Alert.alert("Atenção", "O nome do projeto/UHE é obrigatório");
      }
      return;
    }
    if (!formComplexoId) {
      if (Platform.OS === "web") {
        window.alert("Selecione o complexo ao qual este projeto pertence");
      } else {
        Alert.alert("Atenção", "Selecione o complexo ao qual este projeto pertence");
      }
      return;
    }
    createMutation.mutate({ ...formData, complexo_id: formComplexoId });
  };

  const complexos = stats?.complexos || [];
  const selectedFormComplexo = complexos.find((c) => c.id === formComplexoId);
  const totalProjetos = complexos.reduce((acc, c) => acc + c.totalUhes, 0);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
          <View>
            <ThemedText style={styles.pageTitle}>Projetos / UHEs</ThemedText>
            <ThemedText style={styles.pageSubtitle}>
              {totalProjetos} projeto{totalProjetos !== 1 ? "s" : ""} em {complexos.length} complexos
            </ThemedText>
          </View>
          <Pressable
            style={[styles.addBtn, { backgroundColor: Colors.light.primary }]}
            onPress={() => handleOpenModal()}
          >
            <Feather name="plus" size={18} color="#fff" />
            <ThemedText style={styles.addBtnText} lightColor="#fff" darkColor="#fff">
              Novo projeto
            </ThemedText>
          </Pressable>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Colors.light.primary}
            style={{ marginTop: 60 }}
          />
        ) : complexos.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="folder" size={48} color={theme.tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>Nenhum complexo cadastrado</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Cadastre os complexos primeiro no painel administrativo
            </ThemedText>
          </View>
        ) : (
          complexos.map((complexo, idx) => (
            <Animated.View
              key={complexo.id}
              entering={FadeInDown.duration(400).delay(idx * 60)}
              style={[styles.complexoCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <Pressable
                style={styles.complexoHeader}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpandedComplexo(expandedComplexo === complexo.id ? null : complexo.id);
                }}
              >
                <View style={[styles.complexoIcon, { backgroundColor: Colors.light.primary + "15" }]}>
                  <Feather name="layers" size={18} color={Colors.light.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.complexoNome}>{complexo.nome}</ThemedText>
                  <ThemedText style={styles.complexoCount}>
                    {complexo.totalUhes} UHE{complexo.totalUhes !== 1 ? "s" : ""} cadastrada{complexo.totalUhes !== 1 ? "s" : ""}
                  </ThemedText>
                </View>
                <View style={styles.complexoActions}>
                  <Pressable
                    style={[styles.addUHEInlineBtn, { backgroundColor: Colors.light.primary }]}
                    onPress={() => handleOpenModal(complexo.id)}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                  </Pressable>
                  <Feather
                    name={expandedComplexo === complexo.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={theme.tabIconDefault}
                  />
                </View>
              </Pressable>

              {expandedComplexo === complexo.id ? (
                <View style={[styles.uhesList, { borderTopColor: theme.border }]}>
                  {complexo.uhes.length === 0 ? (
                    <View style={styles.emptyUHEs}>
                      <ThemedText style={styles.emptyUHEsText}>
                        Nenhum projeto cadastrado neste complexo
                      </ThemedText>
                      <Pressable
                        style={[styles.addFirstBtn, { borderColor: Colors.light.primary }]}
                        onPress={() => handleOpenModal(complexo.id)}
                      >
                        <Feather name="plus" size={14} color={Colors.light.primary} />
                        <ThemedText
                          style={styles.addFirstBtnText}
                          lightColor={Colors.light.primary}
                          darkColor={Colors.light.primary}
                        >
                          Adicionar primeiro projeto
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    complexo.uhes.map((uhe) => (
                      <Pressable
                        key={uhe.id}
                        style={[styles.uheItem, { backgroundColor: theme.backgroundRoot }]}
                        onPress={() => handleOpenModal(complexo.id, uhe)}
                      >
                        <View style={styles.uheIcon}>
                          <Feather name="zap" size={16} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.uheName}>{uhe.nome}</ThemedText>
                          <View style={styles.uheDetails}>
                            {uhe.codigo ? (
                              <ThemedText style={styles.uheDetail}>{uhe.codigo}</ThemedText>
                            ) : null}
                            {uhe.municipios ? (
                              <ThemedText style={styles.uheDetail} numberOfLines={1}>
                                {uhe.municipios}
                              </ThemedText>
                            ) : null}
                          </View>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: uhe.ativo ? "#22c55e20" : "#ef444420" }]}>
                          <ThemedText
                            style={[styles.statusText, { color: uhe.ativo ? "#22c55e" : "#ef4444" }]}
                          >
                            {uhe.ativo ? "Ativo" : "Inativo"}
                          </ThemedText>
                        </View>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </Animated.View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>
                {editingProjeto ? "Editar projeto" : "Novo projeto / UHE"}
              </ThemedText>
              <ThemedText style={styles.modalSubtitle}>
                {editingProjeto
                  ? "Edite as informações do projeto"
                  : "Preencha os dados do projeto dentro do complexo"}
              </ThemedText>
            </View>
            <Pressable onPress={() => setModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.fieldLabel}>Complexo *</ThemedText>
            <Pressable
              style={[
                styles.fieldInput,
                { backgroundColor: theme.backgroundDefault, borderColor: formComplexoId ? Colors.light.primary : theme.border },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setShowComplexoDropdown(!showComplexoDropdown);
              }}
            >
              <Feather
                name="layers"
                size={16}
                color={formComplexoId ? Colors.light.primary : theme.tabIconDefault}
                style={{ marginRight: 8 }}
              />
              <ThemedText
                style={styles.fieldInputText}
                lightColor={formComplexoId ? "#1F2937" : theme.tabIconDefault}
                darkColor={formComplexoId ? "#E5E7EB" : theme.tabIconDefault}
              >
                {selectedFormComplexo ? selectedFormComplexo.nome : "Selecione o complexo"}
              </ThemedText>
              <Feather name="chevron-down" size={16} color={theme.tabIconDefault} />
            </Pressable>

            {showComplexoDropdown ? (
              <View style={[styles.dropdown, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                {complexos.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.dropdownItem,
                      formComplexoId === c.id && { backgroundColor: Colors.light.primary + "15" },
                    ]}
                    onPress={() => {
                      setFormComplexoId(c.id);
                      setShowComplexoDropdown(false);
                      Haptics.selectionAsync();
                    }}
                  >
                    <ThemedText
                      style={styles.dropdownItemText}
                      lightColor={formComplexoId === c.id ? Colors.light.primary : "#374151"}
                      darkColor={formComplexoId === c.id ? Colors.light.primary : "#E5E7EB"}
                    >
                      {c.nome}
                    </ThemedText>
                    {formComplexoId === c.id ? (
                      <Feather name="check" size={16} color={Colors.light.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {[
              { label: "Nome do projeto / UHE *", key: "nome", placeholder: "Ex: UHE Itupararanga", icon: "zap" },
              { label: "Código", key: "codigo", placeholder: "Ex: UHE-ITP", icon: "hash" },
              { label: "Reservatório", key: "reservatorio", placeholder: "Nome do reservatório", icon: "droplet" },
              { label: "Rio principal", key: "rio_principal", placeholder: "Ex: Rio Sorocaba", icon: "navigation" },
              { label: "Municípios", key: "municipios", placeholder: "Ex: Ibiúna, Piedade, São Roque", icon: "map-pin" },
              { label: "Descrição", key: "descricao", placeholder: "Informações adicionais", icon: "info" },
            ].map((field) => (
              <View key={field.key}>
                <ThemedText style={styles.fieldLabel}>{field.label}</ThemedText>
                <View
                  style={[
                    styles.fieldInput,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                >
                  <Feather
                    name={field.icon as any}
                    size={16}
                    color={theme.tabIconDefault}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={[styles.fieldInputText, { color: theme.text }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.tabIconDefault}
                    value={(formData as any)[field.key]}
                    onChangeText={(text) => setFormData((prev) => ({ ...prev, [field.key]: text }))}
                    autoCapitalize={field.key === "codigo" ? "characters" : "words"}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <Pressable
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.cancelBtnText}>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, { backgroundColor: Colors.light.primary }]}
              onPress={handleSave}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <ThemedText style={styles.saveBtnText} lightColor="#fff" darkColor="#fff">
                    Salvar projeto
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  pageTitle: { fontSize: 22, fontWeight: "700" },
  pageSubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, fontWeight: "700" },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptySubtitle: { fontSize: 13, color: Colors.light.textSecondary, textAlign: "center" },
  complexoCard: {
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  complexoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  complexoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  complexoNome: { fontSize: 15, fontWeight: "700" },
  complexoCount: { fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  complexoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  addUHEInlineBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  uhesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  emptyUHEs: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  emptyUHEsText: { fontSize: 13, color: Colors.light.textSecondary, textAlign: "center" },
  addFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  addFirstBtnText: { fontSize: 13, fontWeight: "600" },
  uheItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 10,
    marginTop: Spacing.sm,
  },
  uheIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF3C720",
    alignItems: "center",
    justifyContent: "center",
  },
  uheName: { fontSize: 14, fontWeight: "600" },
  uheDetails: { flexDirection: "row", gap: Spacing.sm, flexWrap: "wrap", marginTop: 2 },
  uheDetail: { fontSize: 11, color: Colors.light.textSecondary },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.xl,
    paddingTop: Spacing["3xl"],
  },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  modalSubtitle: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  modalBody: { flex: 1, paddingHorizontal: Spacing.xl },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: Spacing.md },
  fieldInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
  },
  fieldInputText: { flex: 1, fontSize: 14 },
  dropdown: {
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: { fontSize: 14 },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveBtnText: { fontSize: 15, fontWeight: "700" },
});
