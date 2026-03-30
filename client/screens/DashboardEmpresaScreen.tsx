import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
// @ts-ignore - expo-file-system types
import * as FileSystem from "expo-file-system";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface DashboardData {
  totalVistorias: number;
  vistoriasPorStatus: { status: string; count: number }[];
  vistoriasPorProjeto: { projeto: string; count: number }[];
  vistoriasPorMes: { mes: string; count: number }[];
  totalUsuarios: number;
  totalProjetos: number;
}

export default function DashboardEmpresaScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

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

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/tenant/empresas", tenantData?.empresa?.id, "dashboard"],
    queryFn: async () => {
      const response = await fetch(
        new URL(`/api/tenant/empresas/${tenantData?.empresa?.id}/dashboard`, getApiUrl()).toString()
      );
      if (!response.ok) throw new Error("Failed to fetch dashboard data");
      return response.json();
    },
    enabled: !!tenantData?.empresa?.id,
  });

  const handleExportExcel = async () => {
    if (!tenantData?.empresa?.id) return;
    
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(
        new URL(`/api/tenant/empresas/${tenantData.empresa.id}/export/excel`, getApiUrl()).toString()
      );
      
      if (!response.ok) throw new Error("Failed to export data");

      const blob = await response.blob();
      
      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_${tenantData.empresa.nome.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.readAsDataURL(blob);
        });

        const fileUri = (FileSystem.cacheDirectory || "") + `relatorio_${tenantData.empresa.nome.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: "base64" as any,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Sucesso", "Arquivo salvo em: " + fileUri);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Erro", "Não foi possível exportar os dados");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (!tenantData?.empresa?.id) return;
    
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(
        new URL(`/api/tenant/empresas/${tenantData.empresa.id}/export/csv`, getApiUrl()).toString()
      );
      
      if (!response.ok) throw new Error("Failed to export data");

      const csvText = await response.text();
      
      if (Platform.OS === "web") {
        const blob = new Blob([csvText], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio_${tenantData.empresa.nome.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const fileUri = (FileSystem.cacheDirectory || "") + `relatorio_${tenantData.empresa.nome.replace(/\s/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csvText);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert("Sucesso", "Arquivo salvo em: " + fileUri);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Erro", "Não foi possível exportar os dados");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExporting(false);
    }
  };

  const statusColors: Record<string, string> = {
    pendente: "#f59e0b",
    em_andamento: "#3b82f6",
    concluida: "#22c55e",
    cancelada: "#ef4444",
  };

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
          <ThemedText style={styles.title}>Dashboard</ThemedText>
          <ThemedText style={[styles.subtitle, { color: theme.tabIconDefault }]}>
            {tenantData?.empresa?.nome}
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#3b82f615" }]}>
            <Feather name="file-text" size={24} color="#3b82f6" />
            <ThemedText style={[styles.statValue, { color: "#3b82f6" }]}>
              {isLoading ? "-" : dashboardData?.totalVistorias || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
              Vistorias
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#8b5cf615" }]}>
            <Feather name="users" size={24} color="#8b5cf6" />
            <ThemedText style={[styles.statValue, { color: "#8b5cf6" }]}>
              {isLoading ? "-" : dashboardData?.totalUsuarios || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
              Usuários
            </ThemedText>
          </View>
          <View style={[styles.statCard, { backgroundColor: "#22c55e15" }]}>
            <Feather name="folder" size={24} color="#22c55e" />
            <ThemedText style={[styles.statValue, { color: "#22c55e" }]}>
              {isLoading ? "-" : dashboardData?.totalProjetos || 0}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: theme.tabIconDefault }]}>
              Projetos
            </ThemedText>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <ThemedText style={styles.sectionTitle}>Vistorias por Status</ThemedText>
          <View style={[styles.chartCard, { backgroundColor: theme.backgroundDefault }]}>
            {isLoading ? (
              <ThemedText style={[styles.loadingText, { color: theme.tabIconDefault }]}>
                Carregando...
              </ThemedText>
            ) : dashboardData?.vistoriasPorStatus?.length ? (
              dashboardData.vistoriasPorStatus.map((item, index) => (
                <View key={item.status} style={styles.barRow}>
                  <ThemedText style={styles.barLabel}>
                    {item.status.replace("_", " ").charAt(0).toUpperCase() + item.status.replace("_", " ").slice(1)}
                  </ThemedText>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: statusColors[item.status] || "#6b7280",
                          width: `${Math.min((item.count / (dashboardData?.totalVistorias || 1)) * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.barValue}>{item.count}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={[styles.emptyText, { color: theme.tabIconDefault }]}>
                Sem dados disponíveis
              </ThemedText>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <ThemedText style={styles.sectionTitle}>Vistorias por Projeto</ThemedText>
          <View style={[styles.chartCard, { backgroundColor: theme.backgroundDefault }]}>
            {isLoading ? (
              <ThemedText style={[styles.loadingText, { color: theme.tabIconDefault }]}>
                Carregando...
              </ThemedText>
            ) : dashboardData?.vistoriasPorProjeto?.length ? (
              dashboardData.vistoriasPorProjeto.map((item, index) => (
                <View key={item.projeto} style={styles.barRow}>
                  <ThemedText style={styles.barLabel} numberOfLines={1}>
                    {item.projeto}
                  </ThemedText>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: Colors.light.primary,
                          width: `${Math.min((item.count / (dashboardData?.totalVistorias || 1)) * 100, 100)}%`,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.barValue}>{item.count}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={[styles.emptyText, { color: theme.tabIconDefault }]}>
                Sem dados disponíveis
              </ThemedText>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <ThemedText style={styles.sectionTitle}>Exportar Dados</ThemedText>
          <View style={styles.exportGrid}>
            <Pressable
              style={[styles.exportButton, { backgroundColor: "#22c55e" }]}
              onPress={handleExportExcel}
              disabled={exporting}
            >
              <Feather name="file" size={24} color="#fff" />
              <ThemedText style={styles.exportButtonText}>
                {exporting ? "Exportando..." : "Excel (.xlsx)"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.exportButton, { backgroundColor: "#3b82f6" }]}
              onPress={handleExportCSV}
              disabled={exporting}
            >
              <Feather name="file-text" size={24} color="#fff" />
              <ThemedText style={styles.exportButtonText}>
                {exporting ? "Exportando..." : "CSV"}
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText style={[styles.exportNote, { color: theme.tabIconDefault }]}>
            Exporta todas as vistorias de todos os projetos da empresa
          </ThemedText>
        </Animated.View>
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
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  chartCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  barLabel: {
    width: 100,
    fontSize: 13,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: "#e5e7eb",
    borderRadius: 10,
    marginHorizontal: Spacing.sm,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 10,
  },
  barValue: {
    width: 30,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  loadingText: {
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  exportGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  exportNote: {
    fontSize: 12,
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
