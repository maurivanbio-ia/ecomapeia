import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Dimensions, Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/hooks/useAuth";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

const { width: screenWidth } = Dimensions.get("window");

interface VistoriaStats {
  total: number;
  thisMonth: number;
  pendentes: number;
  concluidas: number;
  byMunicipio: Record<string, number>;
  byStatus: Record<string, number>;
  recentActivity: Array<{
    id: string;
    proprietario: string;
    municipio: string;
    data_vistoria: string;
  }>;
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const { data: vistoriasData, isLoading } = useQuery({
    queryKey: [`/api/vistorias?usuario_id=${user?.id}`],
    enabled: !!user?.id,
  });

  const vistorias = vistoriasData || [];

  const stats: VistoriaStats = React.useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const byMunicipio: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let thisMonth = 0;

    vistorias.forEach((v: any) => {
      if (v.municipio) {
        byMunicipio[v.municipio] = (byMunicipio[v.municipio] || 0) + 1;
      }
      
      const status = v.status_acao || "Pendente";
      byStatus[status] = (byStatus[status] || 0) + 1;

      const vistoriaDate = new Date(v.data_vistoria);
      if (vistoriaDate >= thisMonthStart) {
        thisMonth++;
      }
    });

    return {
      total: vistorias.length,
      thisMonth,
      pendentes: byStatus["Pendente"] || 0,
      concluidas: byStatus["Concluída"] || byStatus["Concluida"] || 0,
      byMunicipio,
      byStatus,
      recentActivity: vistorias.slice(0, 5),
    };
  }, [vistorias]);

  const handleExportCSV = async () => {
    if (vistorias.length === 0) {
      Alert.alert("Aviso", "Não há vistorias para exportar");
      return;
    }

    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(
        new URL("/api/features/export-csv", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vistorias }),
        }
      );

      if (Platform.OS === "web") {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vistorias_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const csvText = await response.text();
        const filename = `vistorias_${new Date().toISOString().split('T')[0]}.csv`;
        const fileUri = FileSystem.documentDirectory + filename;
        
        await FileSystem.writeAsStringAsync(fileUri, csvText, {
          encoding: "utf8" as any,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/csv",
            dialogTitle: "Exportar Vistorias",
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Erro", "Não foi possível exportar os dados");
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, icon, color }: { title: string; value: number; icon: keyof typeof Feather.glyphMap; color: string }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statTitle}>{title}</ThemedText>
    </View>
  );

  const ChartBar = ({ label, value, maxValue, color }: { label: string; value: number; maxValue: number; color: string }) => {
    const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <View style={styles.chartBarContainer}>
        <ThemedText style={styles.chartLabel} numberOfLines={1}>{label}</ThemedText>
        <View style={styles.chartBarTrack}>
          <View style={[styles.chartBarFill, { width: `${width}%`, backgroundColor: color }]} />
        </View>
        <ThemedText style={styles.chartValue}>{value}</ThemedText>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </ThemedView>
    );
  }

  const municipioEntries = Object.entries(stats.byMunicipio).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxMunicipioValue = municipioEntries.length > 0 ? municipioEntries[0][1] : 0;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.greeting}>Dashboard</ThemedText>
            <ThemedText style={styles.subtitle}>Visão geral das vistorias</ThemedText>
          </View>
          <Pressable
            style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
            onPress={handleExportCSV}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="download" size={18} color="#fff" />
                <ThemedText style={styles.exportButtonText}>Exportar</ThemedText>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <StatCard title="Total" value={stats.total} icon="clipboard" color={Colors.light.accent} />
          <StatCard title="Este mês" value={stats.thisMonth} icon="calendar" color={Colors.light.success} />
          <StatCard title="Pendentes" value={stats.pendentes} icon="clock" color={Colors.light.warning} />
          <StatCard title="Concluídas" value={stats.concluidas} icon="check-circle" color={Colors.light.success} />
        </View>

        {municipioEntries.length > 0 && (
          <View style={styles.chartSection}>
            <ThemedText style={styles.sectionTitle}>Vistorias por Município</ThemedText>
            <View style={styles.chartContainer}>
              {municipioEntries.map(([municipio, count], index) => (
                <ChartBar
                  key={municipio}
                  label={municipio}
                  value={count}
                  maxValue={maxMunicipioValue}
                  color={[Colors.light.accent, Colors.light.success, Colors.light.warning, "#9b59b6", "#e67e22"][index % 5]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.recentSection}>
          <ThemedText style={styles.sectionTitle}>Atividade Recente</ThemedText>
          {stats.recentActivity.length === 0 ? (
            <ThemedText style={styles.noActivity}>Nenhuma atividade recente</ThemedText>
          ) : (
            <View style={styles.activityList}>
              {stats.recentActivity.map((item: any) => (
                <View key={item.id} style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <ThemedText style={styles.activityName}>{item.proprietario}</ThemedText>
                    <ThemedText style={styles.activityMeta}>
                      {item.municipio} • {new Date(item.data_vistoria).toLocaleDateString("pt-BR")}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xl,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.accent,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: (screenWidth - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
  },
  statTitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  chartSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  chartContainer: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  chartBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  chartLabel: {
    width: 80,
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  chartBarTrack: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.light.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  chartBarFill: {
    height: "100%",
    borderRadius: 10,
  },
  chartValue: {
    width: 30,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  recentSection: {
    marginBottom: Spacing.xl,
  },
  noActivity: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
  },
  activityList: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.accent,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityMeta: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
