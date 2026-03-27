import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { useNavigation } from "@react-navigation/native";

interface Empresa {
  id: number;
  nome: string;
  cnpj: string | null;
  logo_url: string | null;
  cor_primaria: string;
  cor_secundaria: string;
}

interface Projeto {
  id: number;
  empresa_id: number;
  complexo_id: number | null;
  complexo_nome: string | null;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  reservatorio: string | null;
  rio_principal: string | null;
  municipios: string | null;
}

interface TenantData {
  empresa: Empresa | null;
  projetoAtual: Projeto | null;
  projetosDisponiveis: Projeto[];
  isAdmin: boolean;
}

interface ComplexoGroup {
  nome: string;
  projetos: Projeto[];
}

const COMPLEXO_COLORS: Record<string, string> = {
  "Juquiá": "#1B6B3A",
  "Sorocaba": "#2563EB",
  "Paranapanema": "#7C3AED",
  "Salto do Rio Verdinho": "#B45309",
};

function getComplexoColor(nome: string | null): string {
  if (!nome) return Colors.light.primary;
  for (const key of Object.keys(COMPLEXO_COLORS)) {
    if (nome.includes(key)) return COMPLEXO_COLORS[key];
  }
  return Colors.light.primary;
}

export default function SelecionarProjetoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const [selectedProjetoId, setSelectedProjetoId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { data: tenantData, isLoading, refetch } = useQuery<TenantData>({
    queryKey: ["/api/tenant/usuarios", user?.id, "tenant"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/usuarios/${user?.id}/tenant`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch tenant data");
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const selectProjetoMutation = useMutation({
    mutationFn: async (projetoId: number) => {
      return apiRequest("POST", `/api/tenant/usuarios/${user?.id}/projeto`, { projeto_id: projetoId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vistorias"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSelectProjeto = async (projetoId: number) => {
    Haptics.selectionAsync();
    setSelectedProjetoId(projetoId);
    selectProjetoMutation.mutate(projetoId);
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </ThemedView>
    );
  }

  const currentProjetoId = selectedProjetoId || tenantData?.projetoAtual?.id;

  // Group projects by complexo
  const projetosDisponiveis = tenantData?.projetosDisponiveis ?? [];
  const groupsMap: Record<string, ComplexoGroup> = {};
  const semComplexo: Projeto[] = [];

  for (const projeto of projetosDisponiveis) {
    if (projeto.complexo_nome) {
      if (!groupsMap[projeto.complexo_nome]) {
        groupsMap[projeto.complexo_nome] = { nome: projeto.complexo_nome, projetos: [] };
      }
      groupsMap[projeto.complexo_nome].projetos.push(projeto);
    } else {
      semComplexo.push(projeto);
    }
  }

  const groups: ComplexoGroup[] = Object.values(groupsMap);
  if (semComplexo.length > 0) {
    groups.push({ nome: "Outros", projetos: semComplexo });
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
            colors={[Colors.light.primary]}
          />
        }
      >
        {tenantData?.empresa ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View
              style={[
                styles.empresaCard,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: tenantData.empresa.cor_primaria,
                },
              ]}
            >
              <View style={styles.empresaHeader}>
                <View
                  style={[
                    styles.empresaIcon,
                    { backgroundColor: tenantData.empresa.cor_primaria },
                  ]}
                >
                  <Feather name="briefcase" size={24} color="#fff" />
                </View>
                <View style={styles.empresaInfo}>
                  <ThemedText style={styles.empresaNome}>
                    {tenantData.empresa.nome}
                  </ThemedText>
                  {tenantData.empresa.cnpj ? (
                    <ThemedText style={[styles.empresaCnpj, { color: theme.tabIconDefault }]}>
                      CNPJ: {tenantData.empresa.cnpj}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <ThemedText style={styles.sectionTitle}>Selecionar Projeto / UHE</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.tabIconDefault }]}>
            Escolha a UHE para visualizar as vistorias
          </ThemedText>
        </Animated.View>

        {groups.length > 0 ? (
          <View style={styles.groupsContainer}>
            {groups.map((group, groupIndex) => {
              const color = getComplexoColor(group.nome);
              return (
                <Animated.View
                  key={group.nome}
                  entering={FadeInDown.duration(400).delay(150 + groupIndex * 60)}
                  style={styles.complexoGroup}
                >
                  <View style={[styles.complexoHeader, { borderLeftColor: color }]}>
                    <View style={[styles.complexoIconSmall, { backgroundColor: color }]}>
                      <Feather name="layers" size={14} color="#fff" />
                    </View>
                    <ThemedText style={[styles.complexoTitle, { color }]}>
                      {group.nome}
                    </ThemedText>
                    <View style={[styles.countBadge, { backgroundColor: color + "20" }]}>
                      <ThemedText style={[styles.countText, { color }]}>
                        {group.projetos.length} {group.projetos.length === 1 ? "UHE" : "UHEs"}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.projetosGrid}>
                    {group.projetos.map((projeto, index) => {
                      const isSelected = currentProjetoId === projeto.id;
                      return (
                        <Animated.View
                          key={projeto.id}
                          entering={FadeInDown.duration(300).delay(180 + groupIndex * 60 + index * 40)}
                        >
                          <Pressable
                            style={[
                              styles.projetoCard,
                              {
                                backgroundColor: isSelected ? color + "12" : theme.backgroundDefault,
                                borderColor: isSelected ? color : theme.border,
                                borderWidth: isSelected ? 2 : 1,
                              },
                            ]}
                            onPress={() => handleSelectProjeto(projeto.id)}
                          >
                            <View style={styles.projetoHeader}>
                              <View
                                style={[
                                  styles.projetoIcon,
                                  { backgroundColor: isSelected ? color : theme.tabIconDefault + "40" },
                                ]}
                              >
                                <Feather
                                  name="zap"
                                  size={18}
                                  color={isSelected ? "#fff" : theme.tabIconDefault}
                                />
                              </View>
                              {isSelected ? (
                                <View style={[styles.selectedBadge, { backgroundColor: color }]}>
                                  <Feather name="check" size={12} color="#fff" />
                                  <ThemedText style={styles.selectedBadgeText}>Ativo</ThemedText>
                                </View>
                              ) : null}
                            </View>

                            <ThemedText style={[styles.projetoNome, isSelected ? { color } : {}]} numberOfLines={2}>
                              {projeto.nome}
                            </ThemedText>

                            {projeto.codigo ? (
                              <View style={[styles.codigoBadge, { backgroundColor: theme.backgroundRoot }]}>
                                <ThemedText style={[styles.codigoText, { color: theme.tabIconDefault }]}>
                                  {projeto.codigo}
                                </ThemedText>
                              </View>
                            ) : null}

                            {projeto.reservatorio ? (
                              <View style={styles.infoRow}>
                                <Feather name="droplet" size={12} color={theme.tabIconDefault} />
                                <ThemedText
                                  style={[styles.infoText, { color: theme.tabIconDefault }]}
                                  numberOfLines={1}
                                >
                                  {projeto.reservatorio}
                                </ThemedText>
                              </View>
                            ) : null}

                            {projeto.municipios ? (
                              <View style={styles.infoRow}>
                                <Feather name="map-pin" size={12} color={theme.tabIconDefault} />
                                <ThemedText
                                  style={[styles.infoText, { color: theme.tabIconDefault }]}
                                  numberOfLines={2}
                                >
                                  {projeto.municipios}
                                </ThemedText>
                              </View>
                            ) : null}
                          </Pressable>
                        </Animated.View>
                      );
                    })}
                  </View>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="folder" size={48} color={theme.tabIconDefault} />
              <ThemedText style={styles.emptyTitle}>
                Nenhum projeto disponível
              </ThemedText>
              <ThemedText style={[styles.emptySubtitle, { color: theme.tabIconDefault }]}>
                Acesse Gerenciar Projetos para adicionar UHEs
              </ThemedText>
            </View>
          </Animated.View>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: Spacing.lg,
  },
  empresaCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderLeftWidth: 4,
  },
  empresaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  empresaIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  empresaInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  empresaNome: {
    fontSize: 18,
    fontWeight: "700",
  },
  empresaCnpj: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: Spacing.lg,
  },
  groupsContainer: {
    gap: Spacing.xl,
  },
  complexoGroup: {
    gap: Spacing.md,
  },
  complexoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: Spacing.sm,
    borderLeftWidth: 3,
    marginBottom: Spacing.xs,
  },
  complexoIconSmall: {
    width: 26,
    height: 26,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  complexoTitle: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: "600",
  },
  projetosGrid: {
    gap: Spacing.sm,
  },
  projetoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  projetoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  projetoIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  selectedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  projetoNome: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  codigoBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  codigoText: {
    fontSize: 11,
    fontWeight: "500",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginTop: 4,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl * 2,
    borderRadius: BorderRadius.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
});
