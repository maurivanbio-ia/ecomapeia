import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
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
  nome: string;
  codigo: string | null;
  descricao: string | null;
  reservatorio: string | null;
  municipios: string | null;
}

interface TenantData {
  empresa: Empresa | null;
  projetoAtual: Projeto | null;
  projetosDisponiveis: Projeto[];
  isAdmin: boolean;
}

export default function SelecionarProjetoScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProjetoId, setSelectedProjetoId] = useState<number | null>(null);

  const { data: tenantData, isLoading } = useQuery<TenantData>({
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

  const selectProjetoMutation = useMutation({
    mutationFn: async (projetoId: number) => {
      return apiRequest(`/api/tenant/usuarios/${user?.id}/projeto`, {
        method: "POST",
        body: JSON.stringify({ projeto_id: projetoId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vistorias"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleSelectProjeto = async (projetoId: number) => {
    Haptics.selectionAsync();
    setSelectedProjetoId(projetoId);
    await selectProjetoMutation.mutateAsync(projetoId);
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </ThemedView>
    );
  }

  const currentProjetoId = selectedProjetoId || tenantData?.projetoAtual?.id;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
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
          <ThemedText style={styles.sectionTitle}>Selecionar Projeto</ThemedText>
          <ThemedText style={[styles.sectionSubtitle, { color: theme.tabIconDefault }]}>
            Escolha o projeto para visualizar as vistorias
          </ThemedText>
        </Animated.View>

        {tenantData?.projetosDisponiveis && tenantData.projetosDisponiveis.length > 0 ? (
          <View style={styles.projetosGrid}>
            {tenantData.projetosDisponiveis.map((projeto, index) => {
              const isSelected = currentProjetoId === projeto.id;
              return (
                <Animated.View
                  key={projeto.id}
                  entering={FadeInDown.duration(400).delay(150 + index * 50)}
                >
                  <Pressable
                    style={[
                      styles.projetoCard,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: isSelected
                          ? Colors.light.primary
                          : theme.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => handleSelectProjeto(projeto.id)}
                  >
                    <View style={styles.projetoHeader}>
                      <View
                        style={[
                          styles.projetoIcon,
                          {
                            backgroundColor: isSelected
                              ? Colors.light.primary
                              : theme.tabIconDefault,
                          },
                        ]}
                      >
                        <Feather
                          name="map-pin"
                          size={20}
                          color="#fff"
                        />
                      </View>
                      {isSelected ? (
                        <View style={[styles.selectedBadge, { backgroundColor: Colors.light.primary }]}>
                          <Feather name="check" size={12} color="#fff" />
                          <ThemedText style={styles.selectedBadgeText}>Ativo</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    <ThemedText style={styles.projetoNome} numberOfLines={2}>
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
                      <ThemedText
                        style={[styles.projetoReservatorio, { color: theme.tabIconDefault }]}
                        numberOfLines={1}
                      >
                        {projeto.reservatorio}
                      </ThemedText>
                    ) : null}

                    {projeto.municipios ? (
                      <ThemedText
                        style={[styles.projetoMunicipios, { color: theme.tabIconDefault }]}
                        numberOfLines={2}
                      >
                        {projeto.municipios}
                      </ThemedText>
                    ) : null}
                  </Pressable>
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
                Entre em contato com o administrador para ser adicionado a um projeto
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
  projetosGrid: {
    gap: Spacing.md,
  },
  projetoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  projetoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  projetoIcon: {
    width: 40,
    height: 40,
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  codigoBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  codigoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  projetoReservatorio: {
    fontSize: 13,
    marginTop: 4,
  },
  projetoMunicipios: {
    fontSize: 12,
    marginTop: 4,
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
