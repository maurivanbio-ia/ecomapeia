import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Pressable } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "concluída":
    case "concluida":
      return Colors.light.success;
    case "em andamento":
      return Colors.light.warning;
    case "pendente":
      return "#6366F1";
    default:
      return Colors.light.primary;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export default function MapaVistoriasScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const queryKey = user?.is_admin
    ? "/api/vistorias?all=true"
    : `/api/vistorias?usuario_id=${user?.id}`;

  const { data: vistorias = [] } = useQuery({
    queryKey: [queryKey],
    enabled: !!user?.id,
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vistorias as any[]) {
      const s = v.status || "Pendente";
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [vistorias]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrapper}>
          <Feather name="map" size={64} color={Colors.light.primary} />
        </View>
        <ThemedText style={styles.title}>Vistorias no Mapa</ThemedText>
        <ThemedText style={[styles.hint, { color: theme.tabIconDefault }]}>
          Use o Expo Go no dispositivo para visualizar as vistorias no mapa interativo
        </ThemedText>

        <View style={styles.statsSection}>
          <ThemedText style={[styles.sectionLabel, { color: theme.tabIconDefault }]}>
            Resumo por status
          </ThemedText>
          {Object.entries(statusCounts).map(([status, count]) => (
            <View
              key={status}
              style={[
                styles.statusRow,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getStatusColor(status) },
                ]}
              />
              <ThemedText style={styles.statusLabel}>{status}</ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(status) + "20" },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusCount,
                    { color: getStatusColor(status) },
                  ]}
                >
                  {count}
                </ThemedText>
              </View>
            </View>
          ))}
          {vistorias.length === 0 ? (
            <View
              style={[
                styles.statusRow,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText style={[styles.statusLabel, { color: theme.tabIconDefault }]}>
                Nenhuma vistoria registrada
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.vistoriasList}>
          <ThemedText style={[styles.sectionLabel, { color: theme.tabIconDefault }]}>
            Vistorias recentes
          </ThemedText>
          {(vistorias as any[]).slice(0, 10).map((v) => (
            <Pressable
              key={v.id}
              style={[
                styles.vistoriaRow,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() =>
                navigation.navigate("DetalhesVistoria", { vistoriaId: v.id })
              }
              testID={`card-vistoria-web-${v.id}`}
            >
              <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: getStatusColor(v.status || "Pendente") },
                ]}
              />
              <View style={styles.vistoriaInfo}>
                <ThemedText style={styles.vistoriaNome} numberOfLines={1}>
                  {v.proprietario_nome || "Sem proprietário"}
                </ThemedText>
                <ThemedText
                  style={[styles.vistoriaMeta, { color: theme.tabIconDefault }]}
                >
                  {v.municipio || "-"} • {formatDate(v.data_vistoria)}
                </ThemedText>
              </View>
              <Feather
                name="chevron-right"
                size={18}
                color={theme.tabIconDefault}
              />
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: Colors.light.primary + "10",
              borderColor: Colors.light.primary + "30",
            },
          ]}
        >
          <Feather name="smartphone" size={24} color={Colors.light.primary} />
          <ThemedText style={[styles.infoTitle, { color: Colors.light.primary }]}>
            Como visualizar no mapa
          </ThemedText>
          <ThemedText style={[styles.infoText, { color: theme.tabIconDefault }]}>
            Baixe o Expo Go, escaneie o QR code do projeto e acesse o mapa interativo com todas as vistorias.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    gap: Spacing.lg,
  },
  iconWrapper: {
    marginTop: Spacing.xl,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  hint: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  statsSection: {
    width: "100%",
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusCount: {
    fontSize: 13,
    fontWeight: "700",
  },
  vistoriasList: {
    width: "100%",
    gap: Spacing.sm,
  },
  vistoriaRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  statusIndicator: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    alignSelf: "stretch",
  },
  vistoriaInfo: {
    flex: 1,
    gap: 3,
  },
  vistoriaNome: {
    fontSize: 14,
    fontWeight: "600",
  },
  vistoriaMeta: {
    fontSize: 12,
  },
  infoCard: {
    width: "100%",
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
