import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  MapBiomasAlert,
  searchAlertsByMunicipality,
  getBiomeColor,
  getSourceLabel,
  formatArea,
  formatDate,
  getAlertSeverity,
  getAlertSeverityColor,
} from "@/lib/mapbiomasUtils";

interface MapBiomasAlertsModalProps {
  visible: boolean;
  onClose: () => void;
  municipio: string;
  theme: any;
}

export function MapBiomasAlertsModal({
  visible,
  onClose,
  municipio,
  theme,
}: MapBiomasAlertsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<MapBiomasAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!municipio) {
      setError("Município não definido na vistoria");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);

    try {
      const results = await searchAlertsByMunicipality(municipio);
      setAlerts(results);
      setHasSearched(true);
      
      if (results.length === 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao buscar alertas");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && !hasSearched) {
      handleSearch();
    }
  }, [visible]);

  const handleClose = () => {
    setAlerts([]);
    setError(null);
    setHasSearched(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <View style={[styles.iconBadge, { backgroundColor: "#2E7D32" + "20" }]}>
                <Feather name="map" size={20} color="#2E7D32" />
              </View>
              <View>
                <ThemedText style={styles.title}>Alertas MapBiomas</ThemedText>
                <ThemedText style={styles.subtitle}>{municipio || "Município"}</ThemedText>
              </View>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <ThemedText style={styles.loadingText}>Buscando alertas em {municipio}...</ThemedText>
            </View>
          ) : error ? (
            <View style={styles.emptyContainer}>
              <Feather name="alert-triangle" size={40} color={Colors.light.error} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable onPress={handleSearch} style={styles.retryButton}>
                <ThemedText style={styles.retryText}>Tentar Novamente</ThemedText>
              </Pressable>
            </View>
          ) : alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="check-circle" size={40} color="#4CAF50" />
              <ThemedText style={styles.emptyTitle}>Nenhum Alerta Encontrado</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Não foram encontrados alertas de desmatamento recentes em {municipio}.
              </ThemedText>
            </View>
          ) : (
            <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.resultsCount}>
                {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} encontrado{alerts.length !== 1 ? "s" : ""}
              </ThemedText>
              
              {alerts.map((alert, index) => {
                const severity = getAlertSeverity(alert.areaHa);
                return (
                  <Animated.View
                    key={alert.alertCode}
                    entering={FadeIn.duration(300).delay(index * 50)}
                    style={[styles.alertCard, { borderColor: theme.border }]}
                  >
                    <View style={styles.alertHeader}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getAlertSeverityColor(severity) + "20" },
                        ]}
                      >
                        <View
                          style={[
                            styles.severityDot,
                            { backgroundColor: getAlertSeverityColor(severity) },
                          ]}
                        />
                        <ThemedText
                          style={[styles.severityText, { color: getAlertSeverityColor(severity) }]}
                        >
                          {formatArea(alert.areaHa)}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.biomeBadge,
                          { backgroundColor: getBiomeColor(alert.biome) + "20" },
                        ]}
                      >
                        <ThemedText style={[styles.biomeText, { color: getBiomeColor(alert.biome) }]}>
                          {alert.biome}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.alertInfo}>
                      <View style={styles.alertRow}>
                        <Feather name="hash" size={14} color={theme.tabIconDefault} />
                        <ThemedText style={styles.alertLabel}>Código:</ThemedText>
                        <ThemedText style={styles.alertValue}>{alert.alertCode}</ThemedText>
                      </View>
                      <View style={styles.alertRow}>
                        <Feather name="calendar" size={14} color={theme.tabIconDefault} />
                        <ThemedText style={styles.alertLabel}>Detectado:</ThemedText>
                        <ThemedText style={styles.alertValue}>{formatDate(alert.detectedAt)}</ThemedText>
                      </View>
                      <View style={styles.alertRow}>
                        <Feather name="database" size={14} color={theme.tabIconDefault} />
                        <ThemedText style={styles.alertLabel}>Fonte:</ThemedText>
                        <ThemedText style={styles.alertValue}>{getSourceLabel(alert.source)}</ThemedText>
                      </View>
                    </View>

                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Feather name="home" size={14} color="#2196F3" />
                        <ThemedText style={styles.statValue}>{alert.ruralPropertiesTotal}</ThemedText>
                        <ThemedText style={styles.statLabel}>CAR</ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <Feather name="layers" size={14} color="#4CAF50" />
                        <ThemedText style={styles.statValue}>{alert.legalReservesTotal}</ThemedText>
                        <ThemedText style={styles.statLabel}>RL</ThemedText>
                      </View>
                      <View style={styles.statItem}>
                        <Feather name="shield" size={14} color="#FF9800" />
                        <ThemedText style={styles.statValue}>{alert.appTotal}</ThemedText>
                        <ThemedText style={styles.statLabel}>APP</ThemedText>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
    minHeight: 400,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: "#2E7D32",
    borderRadius: BorderRadius.md,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  alertsList: {
    flex: 1,
    padding: Spacing.lg,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  severityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  biomeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  biomeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  alertInfo: {
    gap: 4,
    marginBottom: Spacing.sm,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  alertLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    width: 70,
  },
  alertValue: {
    fontSize: 12,
    flex: 1,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    color: Colors.light.textSecondary,
  },
});
