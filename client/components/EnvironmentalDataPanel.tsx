import React, { useState, useCallback, useEffect } from "react";
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
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/queryClient";

export interface PolygonData {
  type: "Polygon";
  coordinates: [number, number][][];
}

interface EnvironmentalDataPanelProps {
  polygon?: PolygonData;
  stateAcronym?: string;
  latitude?: number;
  longitude?: number;
  onClose?: () => void;
}

type TabType = "summary" | "inpe" | "ana" | "sibbr";

interface AnalysisData {
  vegetation?: { ndvi: number; health: string };
  deforestation?: { alerts: number; riskLevel: string };
  hydrology?: { stations: number; basin: string };
  biodiversity?: { species: number; threatened: number };
}

export function EnvironmentalDataPanel({
  polygon,
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
  const [data, setData] = useState<AnalysisData>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const mockData: AnalysisData = {
        vegetation: { ndvi: 0.65, health: "Boa" },
        deforestation: { alerts: 2, riskLevel: "Baixo" },
        hydrology: { stations: 5, basin: "Alto Tietê" },
        biodiversity: { species: 120, threatened: 8 },
      };
      setData(mockData);
    } catch (err) {
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  }, [polygon, stateAcronym]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, []);

  const tabs = [
    { key: "summary" as TabType, icon: "layers" as const, label: "Resumo" },
    { key: "inpe" as TabType, icon: "alert-triangle" as const, label: "INPE" },
    { key: "ana" as TabType, icon: "droplet" as const, label: "ANA" },
    { key: "sibbr" as TabType, icon: "feather" as const, label: "SiBBr" },
  ];

  const getNDVIColor = (value: number): string => {
    if (value >= 0.6) return "#4caf50";
    if (value >= 0.4) return "#ffeb3b";
    return "#ff9800";
  };

  const getRiskColor = (level: string): string => {
    if (level === "Alto") return "#e53935";
    if (level === "Médio") return "#ff9800";
    return "#4caf50";
  };

  const renderSummary = () => (
    <View style={styles.tabContent}>
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Análise de Vegetação (NDVI)</Text>
        {data.vegetation ? (
          <View style={styles.cardRow}>
            <View style={[styles.ndviIndicator, { backgroundColor: getNDVIColor(data.vegetation.ndvi) }]}>
              <Text style={styles.ndviValue}>{data.vegetation.ndvi.toFixed(2)}</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
              Saúde: {data.vegetation.health}
            </Text>
          </View>
        ) : (
          <Text style={[styles.cardValue, { color: colors.textSecondary }]}>Sem dados</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Alertas de Desmatamento (DETER)</Text>
        {data.deforestation ? (
          <View style={styles.cardRow}>
            <View style={[styles.alertBadge, { backgroundColor: getRiskColor(data.deforestation.riskLevel) }]}>
              <Text style={styles.alertBadgeText}>{data.deforestation.alerts}</Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
              Risco: {data.deforestation.riskLevel}
            </Text>
          </View>
        ) : (
          <Text style={[styles.cardValue, { color: colors.textSecondary }]}>Sem alertas</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Recursos Hídricos (ANA)</Text>
        {data.hydrology ? (
          <View>
            <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
              {data.hydrology.stations} estações próximas
            </Text>
            <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
              Bacia: {data.hydrology.basin}
            </Text>
          </View>
        ) : (
          <Text style={[styles.cardValue, { color: colors.textSecondary }]}>Sem dados</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Biodiversidade (SiBBr)</Text>
        {data.biodiversity ? (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{data.biodiversity.species}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Espécies</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: "#e53935" }]}>{data.biodiversity.threatened}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Ameaçadas</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.cardValue, { color: colors.textSecondary }]}>Sem dados</Text>
        )}
      </View>
    </View>
  );

  const renderINPE = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.backgroundSecondary }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          INPE TerraBrasilis - PRODES/DETER
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dados de Desmatamento</Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • PRODES: Taxa anual consolidada
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • DETER: Alertas em tempo real
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Queimadas: Focos de incêndio
        </Text>
      </View>
    </View>
  );

  const renderANA = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.backgroundSecondary }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          ANA Hidroweb - SNIRH
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dados Hidrológicos</Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Estações fluviométricas
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Estações pluviométricas
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Dados telemétricos em tempo real
        </Text>
      </View>
    </View>
  );

  const renderSiBBr = () => (
    <View style={styles.tabContent}>
      <View style={[styles.sourceCard, { backgroundColor: colors.backgroundSecondary }]}>
        <Feather name="database" size={16} color={colors.primary} />
        <Text style={[styles.sourceText, { color: colors.textSecondary }]}>
          SiBBr / GBIF
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Dados de Biodiversidade</Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Ocorrências de espécies
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Espécies ameaçadas (IUCN)
        </Text>
        <Text style={[styles.cardValue, { color: colors.textSecondary }]}>
          • Catálogo taxonômico
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
      <View style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.headerContent}>
          <Feather name="globe" size={24} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Dados Ambientais</Text>
        </View>
        {onClose ? (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : null}
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
              activeTab === tab.key
                ? { backgroundColor: colors.primary }
                : { backgroundColor: colors.backgroundTertiary },
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
            Carregando dados...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {activeTab === "summary" && renderSummary()}
          {activeTab === "inpe" && renderINPE()}
          {activeTab === "ana" && renderANA()}
          {activeTab === "sibbr" && renderSiBBr()}
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
    fontSize: 18,
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
  },
  tabLabel: {
    fontSize: 14,
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
    fontSize: 14,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardValue: {
    fontSize: 14,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  ndviIndicator: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  ndviValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  alertBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  alertBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.sm,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  sourceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  sourceText: {
    fontSize: 12,
  },
});

export default EnvironmentalDataPanel;
