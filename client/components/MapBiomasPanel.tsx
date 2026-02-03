import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import {
  searchAlert,
  searchAlertsByMunicipality,
  MapBiomasAlert,
  getBiomeColor,
  getSourceLabel,
  formatArea,
  formatDate,
  getAlertSeverity,
  getAlertSeverityColor,
} from "@/lib/mapbiomasUtils";

interface MapBiomasPanelProps {
  theme: any;
  onAlertSelect?: (alertCode: number) => void;
}

type SearchMode = "code" | "inspection";

export function MapBiomasPanel({ theme, onAlertSelect }: MapBiomasPanelProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>("code");
  const [isLoading, setIsLoading] = useState(false);
  const [alertCode, setAlertCode] = useState("");
  const [alert, setAlert] = useState<MapBiomasAlert | null>(null);
  const [alerts, setAlerts] = useState<MapBiomasAlert[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVistoria, setSelectedVistoria] = useState<any>(null);

  const { data: vistorias = [] } = useQuery<any[]>({
    queryKey: ["/api/vistorias"],
  });

  const handleSearchByCode = async () => {
    const code = parseInt(alertCode, 10);
    if (isNaN(code) || code <= 0) {
      setError("Digite um código de alerta válido");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);
    setAlert(null);
    setAlerts([]);

    try {
      const result = await searchAlert(code);
      if (result) {
        setAlert(result);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Alerta não encontrado");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (err: any) {
      setError(err.message || "Falha ao buscar alerta");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByInspection = async (vistoria: any) => {
    if (!vistoria?.municipio) {
      setError("Vistoria não possui município definido");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);
    setAlert(null);
    setAlerts([]);
    setSelectedVistoria(vistoria);

    try {
      const results = await searchAlertsByMunicipality(vistoria.municipio);
      setAlerts(results);
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

  const handleModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
    setAlert(null);
    setAlerts([]);
    setError(null);
    setSelectedVistoria(null);
    setAlertCode("");
  };

  const severity = alert ? getAlertSeverity(alert.areaHa) : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: "#2E7D32" + "20" }]}>
          <Feather name="map" size={20} color="#2E7D32" />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>MapBiomas Alerta</ThemedText>
          <ThemedText style={styles.subtitle}>Consulta de Alertas de Desmatamento</ThemedText>
        </View>
      </View>

      <View style={styles.modeTabs}>
        <Pressable
          onPress={() => handleModeChange("code")}
          style={[
            styles.modeTab,
            { backgroundColor: searchMode === "code" ? "#2E7D32" : theme.border + "40" },
          ]}
        >
          <Feather
            name="hash"
            size={14}
            color={searchMode === "code" ? "#FFFFFF" : theme.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.modeTabText,
              { color: searchMode === "code" ? "#FFFFFF" : theme.text },
            ]}
          >
            Por Código
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => handleModeChange("inspection")}
          style={[
            styles.modeTab,
            { backgroundColor: searchMode === "inspection" ? "#2E7D32" : theme.border + "40" },
          ]}
        >
          <Feather
            name="clipboard"
            size={14}
            color={searchMode === "inspection" ? "#FFFFFF" : theme.tabIconDefault}
          />
          <ThemedText
            style={[
              styles.modeTabText,
              { color: searchMode === "inspection" ? "#FFFFFF" : theme.text },
            ]}
          >
            Por Vistoria
          </ThemedText>
        </Pressable>
      </View>

      {searchMode === "code" ? (
        <>
          <ThemedText style={styles.description}>
            Consulte alertas de desmatamento pelo código do alerta MapBiomas.
          </ThemedText>

          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.border + "40", color: theme.text }]}
              placeholder="Código do alerta (ex: 12345)"
              placeholderTextColor={theme.tabIconDefault}
              value={alertCode}
              onChangeText={setAlertCode}
              keyboardType="numeric"
            />
            <Pressable
              onPress={handleSearchByCode}
              disabled={isLoading || !alertCode.trim()}
              style={[
                styles.searchButton,
                { 
                  backgroundColor: alertCode.trim() ? "#2E7D32" : theme.border,
                  opacity: isLoading ? 0.7 : 1 
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="search" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <ThemedText style={styles.description}>
            Selecione uma vistoria para buscar alertas no município correspondente.
          </ThemedText>

          {vistorias.length > 0 ? (
            <ScrollView style={styles.vistoriasList} nestedScrollEnabled>
              {vistorias.map((v: any) => (
                <Pressable
                  key={v.id}
                  onPress={() => handleSearchByInspection(v)}
                  style={[
                    styles.vistoriaItem,
                    { 
                      borderColor: selectedVistoria?.id === v.id ? "#2E7D32" : theme.border,
                      backgroundColor: selectedVistoria?.id === v.id ? "#2E7D32" + "10" : "transparent",
                    },
                  ]}
                >
                  <View style={styles.vistoriaInfo}>
                    <ThemedText style={styles.vistoriaNotificacao} numberOfLines={1}>
                      {v.numero_notificacao || "Sem número"}
                    </ThemedText>
                    <ThemedText style={styles.vistoriaMunicipio} numberOfLines={1}>
                      <Feather name="map-pin" size={11} color={theme.tabIconDefault} />{" "}
                      {v.municipio || "Sem município"}
                    </ThemedText>
                  </View>
                  <Feather
                    name={selectedVistoria?.id === v.id ? "check-circle" : "chevron-right"}
                    size={16}
                    color={selectedVistoria?.id === v.id ? "#2E7D32" : theme.tabIconDefault}
                  />
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyVistorias}>
              <Feather name="inbox" size={24} color={theme.tabIconDefault} />
              <ThemedText style={styles.emptyVistoriasText}>
                Nenhuma vistoria cadastrada
              </ThemedText>
            </View>
          )}
        </>
      )}

      {error ? (
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      ) : null}

      {alert ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <ScrollView style={styles.content} nestedScrollEnabled>
            <Pressable
              onPress={() => onAlertSelect?.(alert.alertCode)}
              style={[styles.alertCard, { borderColor: theme.border }]}
            >
              <View style={styles.alertHeader}>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getAlertSeverityColor(severity!) + "20" },
                  ]}
                >
                  <View
                    style={[
                      styles.severityDot,
                      { backgroundColor: getAlertSeverityColor(severity!) },
                    ]}
                  />
                  <ThemedText
                    style={[styles.severityText, { color: getAlertSeverityColor(severity!) }]}
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
                  <Feather name="check-circle" size={14} color={theme.tabIconDefault} />
                  <ThemedText style={styles.alertLabel}>Publicado:</ThemedText>
                  <ThemedText style={styles.alertValue}>{formatDate(alert.publishedAt)}</ThemedText>
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
                <View style={styles.alertRow}>
                  <Feather name="info" size={14} color={theme.tabIconDefault} />
                  <ThemedText style={styles.alertLabel}>Status:</ThemedText>
                  <ThemedText style={styles.alertValue}>{alert.statusName}</ThemedText>
                </View>
              </View>

              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Feather name="home" size={16} color="#2196F3" />
                  <ThemedText style={styles.statValue}>{alert.ruralPropertiesTotal}</ThemedText>
                  <ThemedText style={styles.statLabel}>Imóveis CAR</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <Feather name="layers" size={16} color="#4CAF50" />
                  <ThemedText style={styles.statValue}>{alert.legalReservesTotal}</ThemedText>
                  <ThemedText style={styles.statLabel}>Reservas Legais</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <Feather name="shield" size={16} color="#FF9800" />
                  <ThemedText style={styles.statValue}>{alert.appTotal}</ThemedText>
                  <ThemedText style={styles.statLabel}>APPs</ThemedText>
                </View>
              </View>

              {alert.legalReservesArea > 0 ? (
                <View style={[styles.areaInfo, { backgroundColor: "#4CAF50" + "10" }]}>
                  <ThemedText style={styles.areaInfoText}>
                    Área em Reserva Legal: {formatArea(alert.legalReservesArea)}
                  </ThemedText>
                </View>
              ) : null}

              {alert.ruralPropertiesCodes && alert.ruralPropertiesCodes.length > 0 ? (
                <View style={styles.carCodesContainer}>
                  <ThemedText style={styles.carCodesTitle}>
                    Códigos CAR afetados ({alert.ruralPropertiesCodes.length}):
                  </ThemedText>
                  {alert.ruralPropertiesCodes.slice(0, 3).map((code, index) => (
                    <ThemedText key={index} style={styles.carCode} numberOfLines={1}>
                      {code}
                    </ThemedText>
                  ))}
                  {alert.ruralPropertiesCodes.length > 3 ? (
                    <ThemedText style={styles.moreItems}>
                      +{alert.ruralPropertiesCodes.length - 3} mais...
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          </ScrollView>
        </Animated.View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <ThemedText style={styles.loadingText}>
            {searchMode === "code" ? "Buscando alerta..." : `Buscando alertas em ${selectedVistoria?.municipio}...`}
          </ThemedText>
        </View>
      ) : null}

      {searchMode === "inspection" && alerts.length > 0 ? (
        <Animated.View entering={FadeIn.duration(400)}>
          <ThemedText style={styles.resultsCount}>
            {alerts.length} alerta{alerts.length !== 1 ? "s" : ""} em {selectedVistoria?.municipio}
          </ThemedText>
          <ScrollView style={styles.alertsList} nestedScrollEnabled>
            {alerts.map((a, index) => {
              const alertSeverity = getAlertSeverity(a.areaHa);
              return (
                <Pressable
                  key={a.alertCode}
                  onPress={() => onAlertSelect?.(a.alertCode)}
                  style={[styles.alertCardCompact, { borderColor: theme.border }]}
                >
                  <View style={styles.alertHeader}>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: getAlertSeverityColor(alertSeverity) + "20" },
                      ]}
                    >
                      <View
                        style={[
                          styles.severityDot,
                          { backgroundColor: getAlertSeverityColor(alertSeverity) },
                        ]}
                      />
                      <ThemedText
                        style={[styles.severityText, { color: getAlertSeverityColor(alertSeverity) }]}
                      >
                        {formatArea(a.areaHa)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.biomeBadge,
                        { backgroundColor: getBiomeColor(a.biome) + "20" },
                      ]}
                    >
                      <ThemedText style={[styles.biomeText, { color: getBiomeColor(a.biome) }]}>
                        {a.biome}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.alertRowCompact}>
                    <ThemedText style={styles.alertCodeText}>#{a.alertCode}</ThemedText>
                    <ThemedText style={styles.alertDateText}>{formatDate(a.detectedAt)}</ThemedText>
                  </View>
                  <View style={styles.statsRowCompact}>
                    <View style={styles.statItemCompact}>
                      <Feather name="home" size={12} color="#2196F3" />
                      <ThemedText style={styles.statValueCompact}>{a.ruralPropertiesTotal}</ThemedText>
                    </View>
                    <View style={styles.statItemCompact}>
                      <Feather name="layers" size={12} color="#4CAF50" />
                      <ThemedText style={styles.statValueCompact}>{a.legalReservesTotal}</ThemedText>
                    </View>
                    <View style={styles.statItemCompact}>
                      <Feather name="shield" size={12} color="#FF9800" />
                      <ThemedText style={styles.statValueCompact}>{a.appTotal}</ThemedText>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>
      ) : null}

      {searchMode === "inspection" && selectedVistoria && alerts.length === 0 && !isLoading && !error ? (
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={40} color="#4CAF50" />
          <ThemedText style={styles.emptyTitle}>Nenhum Alerta</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Não foram encontrados alertas de desmatamento em {selectedVistoria.municipio}.
          </ThemedText>
        </View>
      ) : null}

      {searchMode === "code" && !alert && !error && !isLoading ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={40} color={theme.tabIconDefault} />
          <ThemedText style={styles.emptyTitle}>Consultar Alerta</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Digite o código do alerta MapBiomas para ver os detalhes de desmatamento, áreas protegidas e propriedades rurais afetadas.
          </ThemedText>
        </View>
      ) : null}

      {searchMode === "inspection" && !selectedVistoria && !isLoading ? (
        <View style={styles.emptyState}>
          <Feather name="clipboard" size={40} color={theme.tabIconDefault} />
          <ThemedText style={styles.emptyTitle}>Selecionar Vistoria</ThemedText>
          <ThemedText style={styles.emptySubtitle}>
            Selecione uma vistoria acima para buscar alertas de desmatamento no município correspondente.
          </ThemedText>
        </View>
      ) : null}
    </View>
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
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontSize: 13,
    color: Colors.light.error,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  content: {
    maxHeight: 500,
  },
  alertCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
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
    fontSize: 13,
    fontWeight: "600",
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
  alertInfo: {
    gap: 6,
    marginBottom: Spacing.md,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  alertLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    width: 80,
  },
  alertValue: {
    fontSize: 13,
    flex: 1,
    fontWeight: "500",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginBottom: Spacing.md,
  },
  statBox: {
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  areaInfo: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  areaInfoText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    textAlign: "center",
  },
  carCodesContainer: {
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: BorderRadius.sm,
  },
  carCodesTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  carCode: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  moreItems: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
    marginTop: 4,
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
    lineHeight: 18,
  },
  modeTabs: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  vistoriasList: {
    maxHeight: 180,
    marginBottom: Spacing.md,
  },
  vistoriaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  vistoriaInfo: {
    flex: 1,
  },
  vistoriaNotificacao: {
    fontSize: 13,
    fontWeight: "600",
  },
  vistoriaMunicipio: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  emptyVistorias: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyVistoriasText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  alertsList: {
    maxHeight: 350,
  },
  alertCardCompact: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  alertRowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  alertCodeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  alertDateText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  statsRowCompact: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: 4,
  },
  statItemCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValueCompact: {
    fontSize: 12,
    fontWeight: "500",
  },
});
