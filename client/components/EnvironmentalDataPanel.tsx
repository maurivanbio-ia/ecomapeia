import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius, FontSizes } from "@/constants/theme";
import {
  analyzeNDVI,
  getDETERAlerts,
  getANAStations,
  getSiBBrOccurrences,
  getSiBBrThreatenedSpecies,
  getUnifiedAnalysis,
  getNDVIColor,
  getRiskLevelColor,
  getIUCNColor,
  formatArea,
  type PolygonData,
  type UnifiedAnalysis,
  type NDVIAnalysis,
  type DETERAlert,
  type ANAStation,
  type SiBBrOccurrence,
} from "@/lib/environmentalUtils";

interface EnvironmentalDataPanelProps {
  polygon?: PolygonData;
  municipalityId?: number;
  stateAcronym?: string;
  latitude?: number;
  longitude?: number;
  onClose?: () => void;
}

type TabType = "summary" | "vegetation" | "deforestation" | "water" | "biodiversity";

export function EnvironmentalDataPanel({
  polygon,
  municipalityId,
  stateAcronym = "SP",
  latitude,
  longitude,
  onClose,
}: EnvironmentalDataPanelProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [activeTab, setActiveTab] = useState<TabType>("summary");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [unifiedData, setUnifiedData] = useState<UnifiedAnalysis | null>(null);
  const [ndviData, setNdviData] = useState<NDVIAnalysis | null>(null);
  const [deterAlerts, setDeterAlerts] = useState<DETERAlert[]>([]);
  const [anaStations, setAnaStations] = useState<ANAStation[]>([]);
  const [biodiversityData, setBiodiversityData] = useState<SiBBrOccurrence[]>([]);
  const [threatenedSpecies, setThreatenedSpecies] = useState<SiBBrOccurrence[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (polygon) {
        const [unified, ndvi] = await Promise.all([
          getUnifiedAnalysis(polygon, municipalityId, stateAcronym),
          analyzeNDVI(polygon),
        ]);
        setUnifiedData(unified);
        setNdviData(ndvi);
      }

      const [deter, stations, occurrences, threatened] = await Promise.all([
        getDETERAlerts("amazonia").catch(() => ({ alerts: [] })),
        getANAStations(stateAcronym).catch(() => ({ stations: [] })),
        latitude && longitude
          ? getSiBBrOccurrences(undefined, stateAcronym, latitude, longitude, 50).catch(() => ({ occurrences: [] }))
          : Promise.resolve({ occurrences: [] }),
        getSiBBrThreatenedSpecies(stateAcronym, 20).catch(() => ({ occurrences: [] })),
      ]);

      setDeterAlerts(deter.alerts || []);
      setAnaStations(stations.stations || []);
      setBiodiversityData(occurrences.occurrences || []);
      setThreatenedSpecies(threatened.occurrences || []);
    } catch (err) {
      console.error("Error loading environmental data:", err);
      setError("Erro ao carregar dados ambientais");
    } finally {
      setLoading(false);
    }
  }, [polygon, municipalityId, stateAcronym, latitude, longitude]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  React.useEffect(() => {
    loadData();
  }, []);

  const tabs: { key: TabType; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: "summary", icon: "layers", label: "Resumo" },
    { key: "vegetation", icon: "sun", label: "NDVI" },
    { key: "deforestation", icon: "alert-triangle", label: "DETER" },
    { key: "water", icon: "droplet", label: "ANA" },
    { key: "biodiversity", icon: "github", label: "SiBBr" },
  ];

  const renderSummaryTab = () => (
    <View style={styles.tabContent}>
      {unifiedData ? (
        <>
          <View style={[styles.statusCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statusHeader}>
              <Feather name="activity" size={24} color={colors.primary} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>
                {unifiedData.summary.overallStatus}
              </Text>
            </View>
            <Text style={[styles.analysisDate, { color: colors.textSecondary }]}>
              Análise: {new Date(unifiedData.analysisDate).toLocaleDateString("pt-BR")}
            </Text>
          </View>

          {Object.entries(unifiedData.sections).map(([key, section]) => (
            <View key={key} style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
              {key === "vegetation" && (
                <>
                  <View style={styles.ndviIndicator}>
                    <View
                      style={[
                        styles.ndviBar,
                        { backgroundColor: getNDVIColor(section.ndvi), width: `${section.ndvi * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={[styles.sectionValue, { color: colors.textSecondary }]}>
                    NDVI: {section.ndvi.toFixed(3)} - {section.health}
                  </Text>
                </>
              )}
              {key === "deforestation" && (
                <>
                  <View style={styles.alertRow}>
                    <Feather
                      name="alert-circle"
                      size={16}
                      color={getRiskLevelColor(section.riskLevel)}
                    />
                    <Text style={[styles.alertText, { color: colors.text }]}>
                      {section.recentAlerts} alertas recentes
                    </Text>
                    <View
                      style={[
                        styles.riskBadge,
                        { backgroundColor: getRiskLevelColor(section.riskLevel) },
                      ]}
                    >
                      <Text style={styles.riskBadgeText}>{section.riskLevel}</Text>
                    </View>
                  </View>
                </>
              )}
              {key === "hydrology" && (
                <Text style={[styles.sectionValue, { color: colors.textSecondary }]}>
                  {section.nearbyStations} estações próximas • Bacia: {section.mainBasin}
                </Text>
              )}
              {key === "biodiversity" && (
                <View style={styles.biodiversityStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: colors.primary }]}>
                      {section.speciesRecorded}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Espécies</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: "#e53935" }]}>
                      {section.threatenedSpecies}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ameaçadas</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: "#4caf50" }]}>
                      {section.endemicSpecies}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Endêmicas</Text>
                  </View>
                </View>
              )}
              {key === "territorialInfo" && (
                <Text style={[styles.sectionValue, { color: colors.textSecondary }]}>
                  Bioma: {section.biome} • {section.microregion}
                </Text>
              )}
            </View>
          ))}

          {unifiedData.summary.recommendations.length > 0 && (
            <View style={[styles.recommendationsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recomendações</Text>
              {unifiedData.summary.recommendations.map((rec, idx) => (
                <View key={idx} style={styles.recommendationItem}>
                  <Feather name="check-circle" size={14} color={colors.primary} />
                  <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
                    {rec}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="map" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Selecione um polígono ou coordenadas para análise ambiental
          </Text>
        </View>
      )}
    </View>
  );

  const renderVegetationTab = () => (
    <View style={styles.tabContent}>
      {ndviData ? (
        <>
          <View style={[styles.ndviCard, { backgroundColor: colors.surface }]}>
            <View style={styles.ndviHeader}>
              <Text style={[styles.ndviValue, { color: getNDVIColor(ndviData.ndvi.value) }]}>
                {ndviData.ndvi.value.toFixed(3)}
              </Text>
              <View style={styles.ndviInfo}>
                <Text style={[styles.ndviHealth, { color: colors.text }]}>{ndviData.ndvi.health}</Text>
                <Text style={[styles.ndviDescription, { color: colors.textSecondary }]}>
                  {ndviData.ndvi.description}
                </Text>
              </View>
            </View>
            <View style={styles.ndviScaleContainer}>
              <View style={styles.ndviScale}>
                {ndviData.ndvi.scale.legend.map((item, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <Text style={[styles.legendRange, { color: colors.textSecondary }]}>
                      {item.range}
                    </Text>
                    <Text style={[styles.legendLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={[styles.landCoverCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cobertura do Solo</Text>
            {ndviData.landCover.classes.map((lc, idx) => (
              <View key={idx} style={styles.landCoverItem}>
                <Text style={[styles.landCoverClass, { color: colors.text }]}>{lc.class}</Text>
                <View style={styles.landCoverBar}>
                  <View
                    style={[
                      styles.landCoverFill,
                      { width: `${lc.percentage}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.landCoverPercentage, { color: colors.textSecondary }]}>
                  {lc.percentage}%
                </Text>
              </View>
            ))}
          </View>

          <View style={[styles.areaCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Área Analisada</Text>
            <Text style={[styles.areaValue, { color: colors.primary }]}>
              {formatArea(ndviData.polygon.areaHa)}
            </Text>
            <Text style={[styles.areaCoords, { color: colors.textSecondary }]}>
              Centro: {ndviData.polygon.center.lat.toFixed(6)}°, {ndviData.polygon.center.lng.toFixed(6)}°
            </Text>
          </View>

          {ndviData.recommendation && (
            <View style={[styles.recommendationCard, { backgroundColor: colors.surface }]}>
              <Feather name="info" size={20} color={colors.primary} />
              <Text style={[styles.recommendationCardText, { color: colors.text }]}>
                {ndviData.recommendation}
              </Text>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="sun" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma análise de vegetação disponível
          </Text>
        </View>
      )}
    </View>
  );

  const renderDeforestationTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          Fonte: INPE TerraBrasilis - DETER
        </Text>
      </View>

      {deterAlerts.length > 0 ? (
        deterAlerts.map((alert, idx) => (
          <View key={idx} style={[styles.alertCard, { backgroundColor: colors.surface }]}>
            <View style={styles.alertHeader}>
              <View style={[styles.alertIcon, { backgroundColor: "#e5393520" }]}>
                <Feather name="alert-triangle" size={16} color="#e53935" />
              </View>
              <View style={styles.alertInfo}>
                <Text style={[styles.alertTitle, { color: colors.text }]}>Alerta #{alert.id}</Text>
                <Text style={[styles.alertDate, { color: colors.textSecondary }]}>
                  {new Date(alert.date).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <Text style={[styles.alertArea, { color: colors.primary }]}>
                {formatArea(alert.areaHa)}
              </Text>
            </View>
            <View style={styles.alertDetails}>
              <Text style={[styles.alertLocation, { color: colors.textSecondary }]}>
                {alert.municipality}, {alert.state}
              </Text>
              <Text style={[styles.alertClass, { color: colors.text }]}>{alert.classeName}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={48} color="#4caf50" />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhum alerta de desmatamento recente na região
          </Text>
        </View>
      )}
    </View>
  );

  const renderWaterTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          Fonte: ANA - Hidroweb (SNIRH)
        </Text>
      </View>

      {anaStations.length > 0 ? (
        anaStations.slice(0, 10).map((station, idx) => (
          <View key={idx} style={[styles.stationCard, { backgroundColor: colors.surface }]}>
            <View style={styles.stationHeader}>
              <View style={[styles.stationIcon, { backgroundColor: colors.primary + "20" }]}>
                <Feather name="droplet" size={16} color={colors.primary} />
              </View>
              <View style={styles.stationInfo}>
                <Text style={[styles.stationName, { color: colors.text }]} numberOfLines={1}>
                  {station.name}
                </Text>
                <Text style={[styles.stationCode, { color: colors.textSecondary }]}>
                  Código: {station.id}
                </Text>
              </View>
            </View>
            <View style={styles.stationDetails}>
              <Text style={[styles.stationDetail, { color: colors.textSecondary }]}>
                <Feather name="map-pin" size={12} /> {station.municipality}, {station.state}
              </Text>
              {station.river && (
                <Text style={[styles.stationDetail, { color: colors.textSecondary }]}>
                  Rio: {station.river}
                </Text>
              )}
              {station.basin && (
                <Text style={[styles.stationDetail, { color: colors.textSecondary }]}>
                  Bacia: {station.basin}
                </Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Feather name="droplet" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma estação hidrológica encontrada
          </Text>
        </View>
      )}
    </View>
  );

  const renderBiodiversityTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.surface }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          Fonte: SiBBr / GBIF
        </Text>
      </View>

      {threatenedSpecies.length > 0 && (
        <View style={[styles.threatenedSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Espécies Ameaçadas</Text>
          {threatenedSpecies.slice(0, 5).map((sp, idx) => (
            <View key={idx} style={styles.speciesItem}>
              <View
                style={[
                  styles.iucnBadge,
                  { backgroundColor: getIUCNColor(sp.iucnRedListCategory || "") },
                ]}
              >
                <Text style={styles.iucnText}>{sp.iucnRedListCategory}</Text>
              </View>
              <View style={styles.speciesInfo}>
                <Text style={[styles.speciesName, { color: colors.text }]} numberOfLines={1}>
                  {sp.scientificName}
                </Text>
                {sp.vernacularName && (
                  <Text style={[styles.vernacularName, { color: colors.textSecondary }]}>
                    {sp.vernacularName}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {biodiversityData.length > 0 ? (
        <View style={[styles.occurrencesSection, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Ocorrências na Região ({biodiversityData.length})
          </Text>
          {biodiversityData.slice(0, 8).map((occ, idx) => (
            <View key={idx} style={styles.occurrenceItem}>
              <Text style={[styles.occurrenceName, { color: colors.text }]} numberOfLines={1}>
                {occ.scientificName}
              </Text>
              <Text style={[styles.occurrenceDetails, { color: colors.textSecondary }]}>
                {occ.family} • {occ.year || "N/A"}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Feather name="feather" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma ocorrência de espécie registrada na região
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <Feather name="globe" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dados Ambientais</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && { backgroundColor: colors.primary },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Feather
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#fff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? "#fff" : colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando dados ambientais...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color="#e53935" />
          <Text style={[styles.errorText, { color: "#e53935" }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadData}>
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {activeTab === "summary" && renderSummaryTab()}
          {activeTab === "vegetation" && renderVegetationTab()}
          {activeTab === "deforestation" && renderDeforestationTab()}
          {activeTab === "water" && renderWaterTab()}
          {activeTab === "biodiversity" && renderBiodiversityTab()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  tabsContainer: {
    maxHeight: 50,
  },
  tabsContent: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  tabLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  tabContent: {
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSizes.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSizes.md,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.md,
    textAlign: "center",
  },
  statusCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  analysisDate: {
    fontSize: FontSizes.sm,
  },
  sectionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  sectionValue: {
    fontSize: FontSizes.sm,
  },
  ndviIndicator: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  ndviBar: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: FontSizes.sm,
  },
  riskBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  riskBadgeText: {
    color: "#fff",
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  biodiversityStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.sm,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: FontSizes.xs,
  },
  recommendationsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recommendationText: {
    flex: 1,
    fontSize: FontSizes.sm,
  },
  ndviCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  ndviHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ndviValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  ndviInfo: {
    flex: 1,
  },
  ndviHealth: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
  ndviDescription: {
    fontSize: FontSizes.sm,
  },
  ndviScaleContainer: {
    marginTop: Spacing.md,
  },
  ndviScale: {
    gap: Spacing.xs,
  },
  legendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendRange: {
    fontSize: FontSizes.xs,
  },
  legendLabel: {
    fontSize: FontSizes.xs,
  },
  landCoverCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  landCoverItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  landCoverClass: {
    width: 100,
    fontSize: FontSizes.sm,
  },
  landCoverBar: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  landCoverFill: {
    height: "100%",
    borderRadius: BorderRadius.full,
  },
  landCoverPercentage: {
    width: 40,
    textAlign: "right",
    fontSize: FontSizes.sm,
  },
  areaCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    gap: Spacing.xs,
  },
  areaValue: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  areaCoords: {
    fontSize: FontSizes.sm,
  },
  recommendationCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    alignItems: "flex-start",
  },
  recommendationCardText: {
    flex: 1,
    fontSize: FontSizes.sm,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  sourceText: {
    fontSize: FontSizes.sm,
  },
  alertCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  alertInfo: {
    flex: 1,
  },
  alertTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  alertDate: {
    fontSize: FontSizes.xs,
  },
  alertArea: {
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  alertDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Spacing.xs,
  },
  alertLocation: {
    fontSize: FontSizes.sm,
  },
  alertClass: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  stationCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  stationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stationIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  stationCode: {
    fontSize: FontSizes.xs,
  },
  stationDetails: {
    gap: 2,
  },
  stationDetail: {
    fontSize: FontSizes.sm,
  },
  threatenedSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  speciesItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  iucnBadge: {
    width: 32,
    height: 24,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  iucnText: {
    color: "#fff",
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },
  speciesInfo: {
    flex: 1,
  },
  speciesName: {
    fontSize: FontSizes.sm,
    fontStyle: "italic",
  },
  vernacularName: {
    fontSize: FontSizes.xs,
  },
  occurrencesSection: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  occurrenceItem: {
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  occurrenceName: {
    fontSize: FontSizes.sm,
    fontStyle: "italic",
  },
  occurrenceDetails: {
    fontSize: FontSizes.xs,
  },
});

export default EnvironmentalDataPanel;
