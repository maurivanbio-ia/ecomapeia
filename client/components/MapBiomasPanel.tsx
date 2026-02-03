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
  getFullAnalysis,
  MapBiomasAlert,
  RuralProperty,
  FullAnalysisSummary,
  Coordinate,
  getBiomeColor,
  getSourceLabel,
  getCARTypeLabel,
  formatArea,
  formatDate,
  getAlertSeverity,
  getAlertSeverityColor,
} from "@/lib/mapbiomasUtils";

interface MapBiomasPanelProps {
  coordinates: Coordinate[];
  theme: any;
  onAlertSelect?: (alertCode: string) => void;
}

export function MapBiomasPanel({ coordinates, theme, onAlertSelect }: MapBiomasPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<FullAnalysisSummary | null>(null);
  const [alerts, setAlerts] = useState<MapBiomasAlert[]>([]);
  const [ruralProperties, setRuralProperties] = useState<RuralProperty[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "alerts" | "properties" | "reserves">("summary");
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
      const result = await getFullAnalysis(coordinates);
      setSummary(result.summary);
      setAlerts(result.alerts);
      setRuralProperties(result.ruralProperties);
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
            <ThemedText style={styles.title}>MapBiomas Alerta</ThemedText>
            <ThemedText style={styles.subtitle}>Análise Ambiental Completa</ThemedText>
          </View>
        </View>

        <ThemedText style={styles.description}>
          Consulte alertas de desmatamento, propriedades rurais, reservas legais e APPs na área do polígono.
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
            {isLoading ? "Analisando..." : "Consultar MapBiomas"}
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
          <ThemedText style={styles.subtitle}>Análise Completa</ThemedText>
        </View>
        <Pressable onPress={handleQuery} style={styles.refreshButton}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.text} />
          ) : (
            <Feather name="refresh-cw" size={18} color={theme.text} />
          )}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabs}>
          {[
            { key: "summary", label: "Resumo", icon: "bar-chart-2" },
            { key: "alerts", label: `Alertas (${alerts.length})`, icon: "alert-triangle" },
            { key: "properties", label: `Imóveis (${ruralProperties.length})`, icon: "home" },
            { key: "reserves", label: "RL/APP", icon: "shield" },
          ].map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: "#2E7D32" + "20" },
              ]}
            >
              <Feather
                name={tab.icon as any}
                size={14}
                color={activeTab === tab.key ? "#2E7D32" : theme.tabIconDefault}
              />
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === tab.key && { color: "#2E7D32", fontWeight: "600" },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView style={styles.content} nestedScrollEnabled>
        {activeTab === "summary" && summary ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: "#F44336" + "15" }]}>
                <Feather name="alert-triangle" size={24} color="#F44336" />
                <ThemedText style={styles.summaryValue}>{summary.totalAlerts}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Alertas</ThemedText>
                <ThemedText style={styles.summarySubvalue}>
                  {formatArea(summary.totalAlertAreaHa)}
                </ThemedText>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: "#2196F3" + "15" }]}>
                <Feather name="home" size={24} color="#2196F3" />
                <ThemedText style={styles.summaryValue}>{summary.totalRuralProperties}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Imóveis</ThemedText>
                <ThemedText style={styles.summarySubvalue}>CAR</ThemedText>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: "#4CAF50" + "15" }]}>
                <Feather name="layers" size={24} color="#4CAF50" />
                <ThemedText style={styles.summaryValue}>
                  {formatArea(summary.totalLegalReserveAreaHa)}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Reserva Legal</ThemedText>
                <ThemedText style={styles.summarySubvalue}>Total RL</ThemedText>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: "#FF9800" + "15" }]}>
                <Feather name="shield" size={24} color="#FF9800" />
                <ThemedText style={styles.summaryValue}>
                  {formatArea(summary.totalAPPAreaHa)}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>APP</ThemedText>
                <ThemedText style={styles.summarySubvalue}>Total APP</ThemedText>
              </View>
            </View>

            {summary.totalAlerts === 0 && summary.totalRuralProperties === 0 ? (
              <View style={styles.noDataBox}>
                <Feather name="check-circle" size={32} color="#4CAF50" />
                <ThemedText style={styles.noDataTitle}>Área sem registros</ThemedText>
                <ThemedText style={styles.noDataText}>
                  Não foram encontrados alertas ou propriedades rurais cadastradas nesta área no último ano.
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}

        {activeTab === "alerts" ? (
          alerts.length > 0 ? (
            alerts.map((alert) => {
              const severity = getAlertSeverity(alert.areaHa);
              return (
                <Pressable
                  key={alert.alertCode}
                  onPress={() => onAlertSelect?.(alert.alertCode)}
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
                      <Feather name="calendar" size={14} color={theme.tabIconDefault} />
                      <ThemedText style={styles.alertLabel}>Detectado:</ThemedText>
                      <ThemedText style={styles.alertValue}>{formatDate(alert.detectedAt)}</ThemedText>
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
                      <ThemedText style={styles.alertValue}>{getSourceLabel(alert.source)}</ThemedText>
                    </View>
                  </View>

                  {alert.cars && alert.cars.length > 0 ? (
                    <View style={styles.carsContainer}>
                      <ThemedText style={styles.carsTitle}>
                        Imóveis afetados: {alert.cars.length}
                      </ThemedText>
                      {alert.cars.slice(0, 2).map((car) => (
                        <View key={car.id} style={styles.carItem}>
                          <ThemedText style={styles.carCode} numberOfLines={1}>
                            {car.code}
                          </ThemedText>
                          <ThemedText style={styles.carArea}>
                            {formatArea(car.intersectionArea)} afetados
                          </ThemedText>
                        </View>
                      ))}
                      {alert.cars.length > 2 ? (
                        <ThemedText style={styles.moreItems}>
                          +{alert.cars.length - 2} mais...
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={styles.alertFooter}>
                    <ThemedText style={styles.alertCode}>#{alert.alertCode}</ThemedText>
                    <Feather name="chevron-right" size={16} color={theme.tabIconDefault} />
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={40} color="#4CAF50" />
              <ThemedText style={styles.emptyTitle}>Nenhum alerta</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Não foram encontrados alertas de desmatamento nesta área no último ano.
              </ThemedText>
            </View>
          )
        ) : null}

        {activeTab === "properties" ? (
          ruralProperties.length > 0 ? (
            ruralProperties.map((prop) => (
              <View key={prop.id} style={[styles.propertyCard, { borderColor: theme.border }]}>
                <View style={styles.propertyHeader}>
                  <View style={[styles.propertyIcon, { backgroundColor: "#2196F3" + "20" }]}>
                    <Feather name="home" size={16} color="#2196F3" />
                  </View>
                  <View style={styles.propertyInfo}>
                    <ThemedText style={styles.propertyCode} numberOfLines={1}>
                      {prop.code}
                    </ThemedText>
                    <ThemedText style={styles.propertyType}>
                      {getCARTypeLabel(prop.type)} - {formatArea(prop.areaHa)}
                    </ThemedText>
                  </View>
                </View>

                {prop.alertAreaInCar > 0 ? (
                  <View style={[styles.alertInCarBadge, { backgroundColor: "#F44336" + "15" }]}>
                    <Feather name="alert-triangle" size={14} color="#F44336" />
                    <ThemedText style={styles.alertInCarText}>
                      Área com alerta: {formatArea(prop.alertAreaInCar)}
                    </ThemedText>
                  </View>
                ) : null}

                <View style={styles.propertyStats}>
                  <View style={styles.statItem}>
                    <Feather name="layers" size={14} color="#4CAF50" />
                    <ThemedText style={styles.statValue}>
                      {prop.legalReserves?.length || 0} RL
                    </ThemedText>
                    {prop.legalReserves && prop.legalReserves.length > 0 ? (
                      <ThemedText style={styles.statSubvalue}>
                        {formatArea(prop.legalReserves.reduce((sum, lr) => sum + lr.areaHa, 0))}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Feather name="shield" size={14} color="#FF9800" />
                    <ThemedText style={styles.statValue}>
                      {prop.permanentProtectedAreas?.length || 0} APP
                    </ThemedText>
                    {prop.permanentProtectedAreas && prop.permanentProtectedAreas.length > 0 ? (
                      <ThemedText style={styles.statSubvalue}>
                        {formatArea(prop.permanentProtectedAreas.reduce((sum, app) => sum + app.areaHa, 0))}
                      </ThemedText>
                    ) : null}
                  </View>
                </View>

                {prop.layerImage || prop.alertInPropertyImage ? (
                  <View style={styles.imagesAvailable}>
                    <Feather name="image" size={12} color={theme.tabIconDefault} />
                    <ThemedText style={styles.imagesText}>Imagens disponíveis</ThemedText>
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Feather name="home" size={40} color={theme.tabIconDefault} />
              <ThemedText style={styles.emptyTitle}>Nenhum imóvel</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Não foram encontradas propriedades rurais cadastradas no CAR nesta área.
              </ThemedText>
            </View>
          )
        ) : null}

        {activeTab === "reserves" ? (
          <View style={styles.reservesContainer}>
            <View style={styles.reserveSection}>
              <View style={styles.reserveHeader}>
                <View style={[styles.reserveIcon, { backgroundColor: "#4CAF50" + "20" }]}>
                  <Feather name="layers" size={16} color="#4CAF50" />
                </View>
                <ThemedText style={styles.reserveTitle}>Reservas Legais (RL)</ThemedText>
              </View>
              
              {ruralProperties.some(p => p.legalReserves && p.legalReserves.length > 0) ? (
                ruralProperties.filter(p => p.legalReserves && p.legalReserves.length > 0).map((prop) => (
                  <View key={`rl-${prop.id}`} style={styles.reservePropertyGroup}>
                    <ThemedText style={styles.reservePropertyCode} numberOfLines={1}>
                      {prop.code}
                    </ThemedText>
                    {prop.legalReserves?.map((lr) => (
                      <View key={lr.id} style={[styles.reserveItem, { borderColor: theme.border }]}>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>Área:</ThemedText>
                          <ThemedText style={styles.reserveItemValue}>{formatArea(lr.areaHa)}</ThemedText>
                        </View>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>CAR:</ThemedText>
                          <ThemedText style={styles.reserveItemValue} numberOfLines={1}>{lr.carCode}</ThemedText>
                        </View>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>UF:</ThemedText>
                          <ThemedText style={styles.reserveItemValue}>{lr.stateAcronym}</ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <ThemedText style={styles.noReservesText}>
                  Nenhuma Reserva Legal encontrada na área
                </ThemedText>
              )}
            </View>

            <View style={styles.reserveSection}>
              <View style={styles.reserveHeader}>
                <View style={[styles.reserveIcon, { backgroundColor: "#FF9800" + "20" }]}>
                  <Feather name="shield" size={16} color="#FF9800" />
                </View>
                <ThemedText style={styles.reserveTitle}>Áreas de Preservação Permanente (APP)</ThemedText>
              </View>
              
              {ruralProperties.some(p => p.permanentProtectedAreas && p.permanentProtectedAreas.length > 0) ? (
                ruralProperties.filter(p => p.permanentProtectedAreas && p.permanentProtectedAreas.length > 0).map((prop) => (
                  <View key={`app-${prop.id}`} style={styles.reservePropertyGroup}>
                    <ThemedText style={styles.reservePropertyCode} numberOfLines={1}>
                      {prop.code}
                    </ThemedText>
                    {prop.permanentProtectedAreas?.map((app) => (
                      <View key={app.id} style={[styles.reserveItem, { borderColor: theme.border }]}>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>Área:</ThemedText>
                          <ThemedText style={styles.reserveItemValue}>{formatArea(app.areaHa)}</ThemedText>
                        </View>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>CAR:</ThemedText>
                          <ThemedText style={styles.reserveItemValue} numberOfLines={1}>{app.carCode}</ThemedText>
                        </View>
                        <View style={styles.reserveItemRow}>
                          <ThemedText style={styles.reserveItemLabel}>UF:</ThemedText>
                          <ThemedText style={styles.reserveItemValue}>{app.stateAcronym}</ThemedText>
                        </View>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <ThemedText style={styles.noReservesText}>
                  Nenhuma APP encontrada na área
                </ThemedText>
              )}
            </View>
          </View>
        ) : null}
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
  tabsScroll: {
    marginBottom: Spacing.md,
  },
  tabs: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  tabText: {
    fontSize: 12,
  },
  content: {
    maxHeight: 450,
  },
  summaryContainer: {
    gap: Spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  summaryCard: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  summarySubvalue: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  noDataBox: {
    alignItems: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: BorderRadius.md,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  noDataText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: "center",
    marginTop: Spacing.xs,
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
  carsContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.sm,
  },
  carsTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  carItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  carCode: {
    fontSize: 11,
    flex: 1,
  },
  carArea: {
    fontSize: 11,
    color: "#F44336",
  },
  moreItems: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 4,
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
  propertyCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  propertyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  propertyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  propertyInfo: {
    flex: 1,
  },
  propertyCode: {
    fontSize: 12,
    fontWeight: "600",
  },
  propertyType: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  alertInCarBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  alertInCarText: {
    fontSize: 12,
    color: "#F44336",
  },
  propertyStats: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  statSubvalue: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: Spacing.sm,
  },
  imagesAvailable: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  imagesText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  reservesContainer: {
    gap: Spacing.lg,
  },
  reserveSection: {
    gap: Spacing.sm,
  },
  reserveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  reserveIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reserveTitle: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  reservePropertyGroup: {
    marginBottom: Spacing.sm,
  },
  reservePropertyCode: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  reserveItem: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: 4,
  },
  reserveItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reserveItemLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  reserveItemValue: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  noReservesText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: Spacing.md,
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
});
