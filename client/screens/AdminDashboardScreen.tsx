import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface UHE {
  id: number;
  nome: string;
  codigo: string | null;
  reservatorio: string | null;
  municipios: string | null;
}

interface ComplexoStats {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  totalUhes: number;
  uhes: UHE[];
  totalVistorias: number;
  totalUsuarios: number;
}

interface AdminStats {
  complexos: ComplexoStats[];
  totais: {
    vistorias: number;
    uhes: number;
    usuarios: number;
    complexos: number;
  };
}

export default function AdminDashboardScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showUHEModal, setShowUHEModal] = useState(false);
  const [selectedComplexo, setSelectedComplexo] = useState<ComplexoStats | null>(null);
  const [expandedComplexo, setExpandedComplexo] = useState<number | null>(null);

  const [uheForm, setUheForm] = useState({
    nome: "",
    codigo: "",
    reservatorio: "",
    rio_principal: "",
    municipios: "",
    descricao: "",
  });

  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  const downloadReport = async (endpoint: string, key: string) => {
    try {
      setDownloadingReport(key);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const url = new URL(endpoint, getApiUrl()).toString();
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar relatório");
      const html = await res.text();

      if (Platform.OS === "web") {
        const win = window.open();
        if (win) { win.document.write(html); win.document.close(); }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Compartilhar Relatório PDF",
          });
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Erro", err.message || "Não foi possível gerar o relatório.");
    } finally {
      setDownloadingReport(null);
    }
  };

  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/complexos/admin/stats"],
    queryFn: async () => {
      const res = await fetch(new URL("/api/complexos/admin/stats", getApiUrl()).toString());
      if (!res.ok) throw new Error("Erro ao carregar estatísticas");
      return res.json();
    },
    enabled: !!user?.is_admin,
    refetchInterval: 30000,
  });

  const createUHEMutation = useMutation({
    mutationFn: async (data: typeof uheForm & { complexo_id: number; empresa_id: number }) => {
      const res = await fetch(
        new URL(`/api/complexos/${data.complexo_id}/uhes`, getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao criar UHE");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/complexos/admin/stats"] });
      setShowUHEModal(false);
      setUheForm({ nome: "", codigo: "", reservatorio: "", rio_principal: "", municipios: "", descricao: "" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert("UHE cadastrada com sucesso!");
      } else {
        Alert.alert("Sucesso", "UHE cadastrada com sucesso!");
      }
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

  const handleAddUHE = (complexo: ComplexoStats) => {
    setSelectedComplexo(complexo);
    setShowUHEModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSubmitUHE = () => {
    if (!uheForm.nome.trim()) {
      if (Platform.OS === "web") {
        window.alert("O nome da UHE é obrigatório");
      } else {
        Alert.alert("Atenção", "O nome da UHE é obrigatório");
      }
      return;
    }
    if (!selectedComplexo) return;

    createUHEMutation.mutate({
      ...uheForm,
      complexo_id: selectedComplexo.id,
      empresa_id: user?.empresa_id || 0,
    });
  };

  const isCoordenador = user?.tipo_usuario === "Coordenador";
  const hasAccess = user?.is_admin || isCoordenador;

  if (!hasAccess) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.accessDenied, { paddingTop: headerHeight + Spacing.xl }]}>
          <Feather name="lock" size={48} color={Colors.light.textSecondary} />
          <ThemedText style={styles.accessDeniedText}>Acesso restrito</ThemedText>
          <ThemedText style={styles.accessDeniedSub}>
            Esta área é exclusiva para administradores e coordenadores.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: headerHeight }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} style={{ marginTop: 60 }} />
      </ThemedView>
    );
  }

  const totais = stats?.totais;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.pageHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.pageTitle}>
                {isCoordenador ? "Painel do Coordenador" : "Painel EcoBrasil"}
              </ThemedText>
              <ThemedText style={styles.pageSubtitle}>
                {isCoordenador
                  ? "Visão geral do seu complexo e todas as vistorias"
                  : "Visão geral de todos os complexos CBA"}
              </ThemedText>
            </View>
            <View
              style={[
                styles.adminBadge,
                { backgroundColor: isCoordenador ? "#6366F1" : Colors.light.primary },
              ]}
            >
              <Feather name={isCoordenador ? "bar-chart-2" : "shield"} size={14} color="#fff" />
              <ThemedText style={styles.adminBadgeText} lightColor="#fff" darkColor="#fff">
                {isCoordenador ? "Coordenador" : "Admin"}
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={[styles.projetosBtn, { backgroundColor: Colors.light.primary + "15" }]}
            onPress={() => navigation.navigate("GerenciarProjetos")}
          >
            <Feather name="folder" size={18} color={Colors.light.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.projetosBtnTitle} lightColor={Colors.light.primary} darkColor={Colors.light.primary}>
                Gerenciar Projetos / UHEs
              </ThemedText>
              <ThemedText style={styles.projetosBtnSub}>
                Cadastre projetos por complexo e UHE
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={18} color={Colors.light.primary} />
          </Pressable>

          <View style={styles.statsRow}>
            {[
              { label: "Complexos", value: totais?.complexos ?? 0, icon: "layers", color: "#6366F1" },
              { label: "UHEs", value: totais?.uhes ?? 0, icon: "zap", color: "#F59E0B" },
              { label: "Vistorias", value: totais?.vistorias ?? 0, icon: "clipboard", color: Colors.light.primary },
              { label: "Usuários", value: totais?.usuarios ?? 0, icon: "users", color: "#10B981" },
            ].map((s, i) => (
              <View
                key={i}
                style={[styles.statCard, { backgroundColor: theme.backgroundDefault, borderLeftColor: s.color }]}
              >
                <Feather name={s.icon as any} size={18} color={s.color} />
                <ThemedText style={styles.statValue}>{s.value}</ThemedText>
                <ThemedText style={styles.statLabel}>{s.label}</ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            style={[styles.relatorioGeralBtn, { borderColor: "#6366F1" }]}
            onPress={() => downloadReport("/api/reports/all", "all")}
            disabled={downloadingReport !== null}
          >
            {downloadingReport === "all" ? (
              <ActivityIndicator size="small" color="#6366F1" />
            ) : (
              <Feather name="download" size={16} color="#6366F1" />
            )}
            <ThemedText style={styles.relatorioGeralText} lightColor="#6366F1" darkColor="#6366F1">
              {downloadingReport === "all" ? "Gerando..." : "Relatório Geral — Todos os Complexos"}
            </ThemedText>
          </Pressable>

          <ThemedText style={styles.sectionTitle}>Complexos Hidrelétricos</ThemedText>

          {stats?.complexos.map((complexo, idx) => (
            <Animated.View
              key={complexo.id}
              entering={FadeInDown.duration(400).delay(idx * 80)}
              style={[styles.complexoCard, { backgroundColor: theme.backgroundDefault }]}
            >
              <Pressable
                style={styles.complexoHeader}
                onPress={() => {
                  Haptics.selectionAsync();
                  setExpandedComplexo(expandedComplexo === complexo.id ? null : complexo.id);
                }}
              >
                <View style={styles.complexoTitleRow}>
                  <View style={[styles.complexoIcon, { backgroundColor: Colors.light.primary + "15" }]}>
                    <Feather name="layers" size={20} color={Colors.light.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.complexoName}>{complexo.nome}</ThemedText>
                    {complexo.descricao ? (
                      <ThemedText style={styles.complexoDesc} numberOfLines={1}>
                        {complexo.descricao}
                      </ThemedText>
                    ) : null}
                  </View>
                  <Feather
                    name={expandedComplexo === complexo.id ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.tabIconDefault}
                  />
                </View>

                <View style={styles.complexoStats}>
                  <View style={styles.complexoStat}>
                    <Feather name="zap" size={13} color="#F59E0B" />
                    <ThemedText style={styles.complexoStatText}>{complexo.totalUhes} UHEs</ThemedText>
                  </View>
                  <View style={styles.complexoStat}>
                    <Feather name="clipboard" size={13} color={Colors.light.primary} />
                    <ThemedText style={styles.complexoStatText}>
                      {complexo.totalVistorias} vistorias
                    </ThemedText>
                  </View>
                  <View style={styles.complexoStat}>
                    <Feather name="users" size={13} color="#10B981" />
                    <ThemedText style={styles.complexoStatText}>
                      {complexo.totalUsuarios} usuários
                    </ThemedText>
                  </View>
                  <Pressable
                    style={styles.relatorioBtn}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      downloadReport(`/api/reports/complexo/${complexo.id}`, `complexo-${complexo.id}`);
                    }}
                    disabled={downloadingReport !== null}
                  >
                    {downloadingReport === `complexo-${complexo.id}` ? (
                      <ActivityIndicator size="small" color={Colors.light.primary} />
                    ) : (
                      <Feather name="download" size={13} color={Colors.light.primary} />
                    )}
                    <ThemedText style={styles.relatorioBtnText} lightColor={Colors.light.primary} darkColor={Colors.light.primary}>
                      Relatório
                    </ThemedText>
                  </Pressable>
                </View>
              </Pressable>

              {expandedComplexo === complexo.id ? (
                <View style={styles.complexoBody}>
                  <View style={styles.uhesHeader}>
                    <ThemedText style={styles.uhesTitle}>UHEs cadastradas</ThemedText>
                    <Pressable
                      style={styles.addUHEButton}
                      onPress={() => handleAddUHE(complexo)}
                    >
                      <Feather name="plus" size={14} color="#fff" />
                      <ThemedText style={styles.addUHEText} lightColor="#fff" darkColor="#fff">
                        Nova UHE
                      </ThemedText>
                    </Pressable>
                  </View>

                  {complexo.uhes.length === 0 ? (
                    <View style={styles.emptyUHEs}>
                      <Feather name="inbox" size={28} color={theme.tabIconDefault} />
                      <ThemedText style={styles.emptyUHEsText}>
                        Nenhuma UHE cadastrada ainda.
                      </ThemedText>
                      <ThemedText style={styles.emptyUHEsSubtext}>
                        Cadastre as UHEs deste complexo após o fechamento do contrato.
                      </ThemedText>
                    </View>
                  ) : (
                    complexo.uhes.map((uhe) => (
                      <View
                        key={uhe.id}
                        style={[styles.uheItem, { backgroundColor: theme.backgroundRoot }]}
                      >
                        <Feather name="zap" size={16} color="#F59E0B" />
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.uheName}>{uhe.nome}</ThemedText>
                          {uhe.codigo ? (
                            <ThemedText style={styles.uheCodigo}>{uhe.codigo}</ThemedText>
                          ) : null}
                          {uhe.municipios ? (
                            <ThemedText style={styles.uheMunicipio} numberOfLines={1}>
                              {uhe.municipios}
                            </ThemedText>
                          ) : null}
                        </View>
                        <Pressable
                          style={styles.uheRelatorioBtn}
                          onPress={() => downloadReport(`/api/reports/uhe/${uhe.id}`, `uhe-${uhe.id}`)}
                          disabled={downloadingReport !== null}
                        >
                          {downloadingReport === `uhe-${uhe.id}` ? (
                            <ActivityIndicator size="small" color="#F59E0B" />
                          ) : (
                            <Feather name="download" size={14} color="#F59E0B" />
                          )}
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </Animated.View>
          ))}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showUHEModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUHEModal(false)}
      >
        <View style={[styles.modal, { backgroundColor: theme.backgroundRoot }]}>
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Nova UHE</ThemedText>
              {selectedComplexo ? (
                <ThemedText style={styles.modalSubtitle}>{selectedComplexo.nome}</ThemedText>
              ) : null}
            </View>
            <Pressable onPress={() => setShowUHEModal(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {[
              { label: "Nome da UHE *", key: "nome", placeholder: "Ex: UHE Itupararanga", icon: "zap" },
              { label: "Código", key: "codigo", placeholder: "Ex: UHE-ITP", icon: "hash" },
              { label: "Reservatório", key: "reservatorio", placeholder: "Nome do reservatório", icon: "droplet" },
              { label: "Rio Principal", key: "rio_principal", placeholder: "Nome do rio", icon: "navigation" },
              { label: "Municípios", key: "municipios", placeholder: "Ex: Ibiúna, Piedade", icon: "map-pin" },
              { label: "Descrição", key: "descricao", placeholder: "Informações adicionais", icon: "info" },
            ].map((field) => (
              <View key={field.key} style={styles.modalField}>
                <ThemedText style={styles.modalFieldLabel}>{field.label}</ThemedText>
                <View style={[styles.modalInput, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                  <Feather name={field.icon as any} size={16} color={theme.tabIconDefault} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.modalInputText, { color: theme.text }]}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.tabIconDefault}
                    value={(uheForm as any)[field.key]}
                    onChangeText={(text) => setUheForm((prev) => ({ ...prev, [field.key]: text }))}
                    autoCapitalize={field.key === "codigo" ? "characters" : "words"}
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <Pressable style={styles.cancelButton} onPress={() => setShowUHEModal(false)}>
              <ThemedText style={styles.cancelText}>Cancelar</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.saveButton, { backgroundColor: Colors.light.primary }]}
              onPress={handleSubmitUHE}
              disabled={createUHEMutation.isPending}
            >
              {createUHEMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name="save" size={16} color="#fff" />
                  <ThemedText style={styles.saveText} lightColor="#fff" darkColor="#fff">
                    Salvar UHE
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
  scroll: { flex: 1 },
  accessDenied: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  accessDeniedText: {
    fontSize: 20,
    fontWeight: "700",
  },
  accessDeniedSub: {
    fontSize: 14,
    textAlign: "center",
    color: Colors.light.textSecondary,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  pageSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  projetosBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    borderRadius: 14,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  projetosBtnTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  projetosBtnSub: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: 70,
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 3,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  complexoCard: {
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  complexoHeader: {
    padding: Spacing.lg,
  },
  complexoTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  complexoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  complexoName: {
    fontSize: 16,
    fontWeight: "700",
  },
  complexoDesc: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  complexoStats: {
    flexDirection: "row",
    gap: Spacing.lg,
    flexWrap: "wrap",
  },
  complexoStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  complexoStatText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  complexoBody: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  uhesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  uhesTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  addUHEButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addUHEText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyUHEs: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyUHEsText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyUHEsSubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
  uheItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 10,
    marginBottom: Spacing.sm,
  },
  uheRelatorioBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
  },
  relatorioGeralBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  relatorioGeralText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  relatorioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: `${Colors.light.primary}18`,
  },
  relatorioBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  uheName: {
    fontSize: 14,
    fontWeight: "600",
  },
  uheCodigo: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  uheMunicipio: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: Spacing.xl,
    paddingTop: Spacing["3xl"],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  modalField: {
    marginBottom: Spacing.md,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInput: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  modalInputText: {
    flex: 1,
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.xl,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  saveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
