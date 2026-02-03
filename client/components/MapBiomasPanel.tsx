import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  getAlertsByLocation,
  getLandCover,
  MapBiomasAlert,
  LandCoverData,
  Coordinate,
  getBiomeColor,
  getSourceLabel,
  getLandCoverColor,
  formatArea,
  formatDate,
} from "@/lib/mapbiomasUtils";

interface MapBiomasPanelProps {
  coordinates: Coordinate[];
  theme: any;
  onAlertSelect?: (alertCode: string) => void;
}

export function MapBiomasPanel({ coordinates, theme, onAlertSelect }: MapBiomasPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<MapBiomasAlert[]>([]);
  const [landCover, setLandCover] = useState<LandCoverData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"alerts" | "landcover">("alerts");
  const [hasQueried, setHasQueried] = useState(false);

  const handleQuery = async () => {
    if (coordinates.length < 3) {
      setError("Adicione pelo menos 3 pontos ao polígono para consultar");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);

    try {
      const [alertsResult, landCoverResult] = await Promise.all([
        getAlertsByLocation(coordinates),
        getLandCover(coordinates),
      ]);

      setAlerts(alertsResult.alerts);
      setLandCover(landCoverResult);
      setHasQueried(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Falha ao consultar MapBiomas");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasQueried) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: "#2E7D32" + "20" }]}>
            <Feather name="map" size={20} color="#2E7D32" />
          </View>
          <View style={styles.headerText}>
            <ThemedText style={styles.title}>MapBiomas</ThemedText>
            <ThemedText style={styles.subtitle}>Alertas e Uso do Solo</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.description}>
          Consulte dados de desmatamento e uso do solo na área do polígono marcado.
        </ThemedText>

        <Pressable
          onPress={handleQuery}
          disabled={isLoading || coordinates.length < 3}
          style={[
            styles.queryButton,
            { 
              backgroundColor: coordinates.length >= 3 ? "#2E7D32" : theme.border,
              opacity: isLoading ? 0.7 : 1 
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="search" size={18} color="#FFFFFF" />
          )}
          <ThemedText style={styles.buttonText}>
            {isLoading ? "Consultando..." : "Consultar MapBiomas"}
          </ThemedText>
        </Pressable>

        {coordinates.length < 3 ? (
          <ThemedText style={styles.warningText}>
            Adicione pelo menos 3 pontos ao polígono
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.container, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: "#2E7D32" + "20" }]}>
          <Feather name="map" size={20} color="#2E7D32" />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>MapBiomas</ThemedText>
          <ThemedText style={styles.subtitle}>
            {alerts.length} alertas encontrados
          </ThemedText>
        </View>
        <Pressable onPress={handleQuery} style={styles.refreshButton}>
          <Feather name="refresh-cw" size={18} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab("alerts")}
          style={[
            styles.tab,
            activeTab === "alerts" && { backgroundColor: "#2E7D32" + "20" },
          ]}
        >
          <Feather
            name="alert-triangle"
            size={16}
            color={activeTab === "alerts" ? "#2E7D32" : theme.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "alerts" && { color: "#2E7D32", fontWeight: "600" },
            ]}
          >
            Alertas ({alerts.length})
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("landcover")}
          style={[
            styles.tab,
            activeTab === "landcover" && { backgroundColor: "#2E7D32" + "20" },
          ]}
        >
          <Feather
            name="layers"
            size={16}
            color={activeTab === "landcover" ? "#2E7D32" : theme.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "landcover" && { color: "#2E7D32", fontWeight: "600" },
            ]}
          >
            Uso do Solo
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.content} nestedScrollEnabled>
        {activeTab === "alerts" ? (
          alerts.length > 0 ? (
            alerts.map((alert) => (
              <Pressable
                key={alert.alertCode}
                onPress={() => onAlertSelect?.(alert.alertCode)}
                style={[styles.alertCard, { borderColor: theme.border }]}
              >
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.biomeBadge,
                      { backgroundColor: getBiomeColor(alert.biome) + "20" },
                    ]}
                  >
                    <ThemedText
                      style={[styles.biomeText, { color: getBiomeColor(alert.biome) }]}
                    >
                      {alert.biome}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.alertArea}>
                    {formatArea(alert.areaHa)}
                  </ThemedText>
                </View>

                <View style={styles.alertInfo}>
                  <View style={styles.alertRow}>
                    <Feather name="calendar" size={14} color={theme.tabIconDefault} />
                    <ThemedText style={styles.alertLabel}>Detectado:</ThemedText>
                    <ThemedText style={styles.alertValue}>
                      {formatDate(alert.detectedAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.alertRow}>
                    <Feather name="map-pin" size={14} color={theme.tabIconDefault} />
                    <ThemedText style={styles.alertLabel}>Local:</ThemedText>
                    <ThemedText style={styles.alertValue} numberOfLines={1}>
                      {alert.city}, {alert.state}
                    </ThemedText>
                  </View>
                  <View style={styles.alertRow}>
                    <Feather name="database" size={14} color={theme.tabIconDefault} />
                    <ThemedText style={styles.alertLabel}>Fonte:</ThemedText>
                    <ThemedText style={styles.alertValue}>
                      {getSourceLabel(alert.source)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.alertFooter}>
                  <ThemedText style={styles.alertCode}>#{alert.alertCode}</ThemedText>
                  <Feather name="chevron-right" size={16} color={theme.tabIconDefault} />
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={40} color="#2E7D32" />
              <ThemedText style={styles.emptyTitle}>Nenhum alerta</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Não foram encontrados alertas de desmatamento nesta área no último ano.
              </ThemedText>
            </View>
          )
        ) : landCover ? (
          <View style={styles.landCoverContainer}>
            <View style={styles.landCoverHeader}>
              <ThemedText style={styles.landCoverYear}>Ano: {landCover.year}</ThemedText>
              <ThemedText style={styles.landCoverTotal}>
                Área total: {formatArea(landCover.totalAreaHa)}
              </ThemedText>
            </View>

            {landCover.message ? (
              <View style={[styles.messageBox, { backgroundColor: theme.border + "40" }]}>
                <Feather name="info" size={16} color={theme.tabIconDefault} />
                <ThemedText style={styles.messageText}>{landCover.message}</ThemedText>
              </View>
            ) : null}

            {landCover.classes.filter(c => c.areaHa > 0).map((cls) => (
              <View key={cls.classId} style={styles.landCoverClass}>
                <View style={styles.classHeader}>
                  <View
                    style={[
                      styles.classColorDot,
                      { backgroundColor: getLandCoverColor(cls.classId) },
                    ]}
                  />
                  <ThemedText style={styles.className}>{cls.className}</ThemedText>
                  <ThemedText style={styles.classPercentage}>
                    {cls.percentage.toFixed(1)}%
                  </ThemedText>
                </View>
                <View style={styles.classBarContainer}>
                  <View
                    style={[
                      styles.classBar,
                      {
                        backgroundColor: getLandCoverColor(cls.classId),
                        width: `${Math.min(cls.percentage, 100)}%`,
                      },
                    ]}
                  />
                </View>
                <ThemedText style={styles.classArea}>{formatArea(cls.areaHa)}</ThemedText>
              </View>
            ))}

            {landCover.classes.filter(c => c.areaHa > 0).length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="layers" size={40} color={theme.tabIconDefault} />
                <ThemedText style={styles.emptyTitle}>Dados indisponíveis</ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  Não há dados de uso do solo disponíveis para esta área.
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="layers" size={40} color={theme.tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>Dados indisponíveis</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Não foi possível carregar dados de uso do solo.
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.lg,
  },
  queryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },
  warningText: {
    fontSize: 13,
    color: Colors.light.warning,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.error,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  tabs: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabText: {
    fontSize: 13,
  },
  content: {
    maxHeight: 400,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  biomeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  biomeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  alertArea: {
    fontSize: 14,
    fontWeight: "700",
  },
  alertInfo: {
    gap: 4,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  alertLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  alertValue: {
    fontSize: 12,
    flex: 1,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  alertCode: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  landCoverContainer: {
    gap: Spacing.md,
  },
  landCoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  landCoverYear: {
    fontSize: 14,
    fontWeight: "600",
  },
  landCoverTotal: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  messageText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  landCoverClass: {
    marginBottom: Spacing.sm,
  },
  classHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  classColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  className: {
    fontSize: 13,
    flex: 1,
  },
  classPercentage: {
    fontSize: 13,
    fontWeight: "600",
  },
  classBarContainer: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 4,
    overflow: "hidden",
  },
  classBar: {
    height: "100%",
    borderRadius: 4,
  },
  classArea: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
});
