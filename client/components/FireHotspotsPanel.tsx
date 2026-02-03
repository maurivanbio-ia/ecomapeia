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
import { getApiUrl } from "@/lib/query-client";

interface FireHotspotsPanelProps {
  theme: any;
  latitude?: number;
  longitude?: number;
}

interface FireData {
  success: boolean;
  coordinates: { latitude: number; longitude: number };
  radiusKm: number;
  period: { start: string; end: string };
  activeHotspots: {
    count: number;
    riskLevel: string;
    hotspots: Hotspot[];
  };
  historical: {
    source: string;
    coverage: string;
    note: string;
    platformUrl: string;
  };
  recommendations: string[];
}

interface Hotspot {
  id: string;
  latitude: number;
  longitude: number;
  datahora: string;
  satelite: string;
  municipio: string;
  estado: string;
  bioma: string;
  diasSemChuva?: number;
  riscofogo?: number;
  frp?: number;
}

export function FireHotspotsPanel({ theme, latitude, longitude }: FireHotspotsPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fireData, setFireData] = useState<FireData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);

  const fetchFireData = async () => {
    if (!latitude || !longitude) {
      setError("Coordenadas GPS não disponíveis. Capture a localização primeiro.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setError(null);
    setFireData(null);

    try {
      const apiUrl = getApiUrl();
      const url = new URL(`/api/mapbiomas/fire/hotspots`, apiUrl);
      url.searchParams.append("latitude", latitude.toString());
      url.searchParams.append("longitude", longitude.toString());
      url.searchParams.append("radius", radiusKm.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      if (response.ok && data.success) {
        setFireData(data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.error || "Falha ao buscar dados de fogo");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao consultar focos de calor");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case "CRÍTICO": return "#D32F2F";
      case "ALTO": return "#F57C00";
      case "MODERADO": return "#FBC02D";
      case "BAIXO": return "#388E3C";
      default: return "#757575";
    }
  };

  const getRiskIcon = (level: string): keyof typeof Feather.glyphMap => {
    switch (level) {
      case "CRÍTICO": return "alert-triangle";
      case "ALTO": return "alert-circle";
      case "MODERADO": return "info";
      case "BAIXO": return "check-circle";
      default: return "help-circle";
    }
  };

  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      <View style={styles.header}>
        <View style={[styles.iconBadge, { backgroundColor: "#FF5722" + "20" }]}>
          <Feather name="zap" size={20} color="#FF5722" />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>MapBiomas Fogo</ThemedText>
          <ThemedText style={styles.subtitle}>Focos de Calor Ativos (48h)</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.description}>
        Consulta focos de incêndio ativos detectados por satélite nas últimas 48 horas, 
        com base nos dados do INPE BDQUEIMADAS.
      </ThemedText>

      {/* Radius Selection */}
      <View style={styles.radiusContainer}>
        <ThemedText style={styles.radiusLabel}>Raio de busca:</ThemedText>
        <View style={styles.radiusButtons}>
          {[25, 50, 100].map((r) => (
            <Pressable
              key={r}
              onPress={() => setRadiusKm(r)}
              style={[
                styles.radiusButton,
                { 
                  backgroundColor: radiusKm === r ? "#FF5722" : theme.border + "40"
                }
              ]}
            >
              <ThemedText style={[
                styles.radiusButtonText,
                { color: radiusKm === r ? "#FFFFFF" : theme.text }
              ]}>
                {r} km
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Coordinates Info */}
      {latitude && longitude ? (
        <View style={[styles.coordsInfo, { backgroundColor: theme.border + "30" }]}>
          <Feather name="map-pin" size={14} color={theme.tabIconDefault} />
          <ThemedText style={[styles.coordsText, { color: theme.tabIconDefault }]}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.coordsInfo, { backgroundColor: "#FFF3E0" }]}>
          <Feather name="alert-circle" size={14} color="#F57C00" />
          <ThemedText style={[styles.coordsText, { color: "#F57C00" }]}>
            Capture as coordenadas GPS primeiro
          </ThemedText>
        </View>
      )}

      {/* Search Button */}
      <Pressable
        onPress={fetchFireData}
        disabled={isLoading || !latitude || !longitude}
        style={[
          styles.searchButton,
          { 
            backgroundColor: latitude && longitude ? "#FF5722" : theme.border,
            opacity: isLoading ? 0.7 : 1 
          }
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="search" size={16} color="#FFFFFF" />
            <ThemedText style={styles.searchButtonText}>
              Consultar Focos de Calor
            </ThemedText>
          </>
        )}
      </Pressable>

      {/* Error Message */}
      {error ? (
        <Animated.View
          entering={FadeIn}
          style={[styles.errorContainer, { backgroundColor: "#FFEBEE" }]}
        >
          <Feather name="alert-circle" size={16} color="#D32F2F" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </Animated.View>
      ) : null}

      {/* Results */}
      {fireData ? (
        <Animated.View entering={FadeIn} style={styles.resultsContainer}>
          {/* Risk Level Card */}
          <View style={[
            styles.riskCard, 
            { 
              backgroundColor: getRiskColor(fireData.activeHotspots.riskLevel) + "15",
              borderColor: getRiskColor(fireData.activeHotspots.riskLevel) + "40"
            }
          ]}>
            <View style={styles.riskHeader}>
              <View style={[
                styles.riskIconContainer,
                { backgroundColor: getRiskColor(fireData.activeHotspots.riskLevel) + "20" }
              ]}>
                <Feather 
                  name={getRiskIcon(fireData.activeHotspots.riskLevel)} 
                  size={24} 
                  color={getRiskColor(fireData.activeHotspots.riskLevel)} 
                />
              </View>
              <View style={styles.riskInfo}>
                <ThemedText style={[
                  styles.riskLevel,
                  { color: getRiskColor(fireData.activeHotspots.riskLevel) }
                ]}>
                  Risco {fireData.activeHotspots.riskLevel}
                </ThemedText>
                <ThemedText style={styles.riskCount}>
                  {fireData.activeHotspots.count} foco(s) detectado(s)
                </ThemedText>
              </View>
            </View>
            <ThemedText style={styles.periodText}>
              Período: {fireData.period.start} a {fireData.period.end}
            </ThemedText>
          </View>

          {/* Recommendations */}
          {fireData.recommendations.length > 0 ? (
            <View style={[styles.recommendationsCard, { backgroundColor: theme.border + "20" }]}>
              <View style={styles.recommendationsHeader}>
                <Feather name="clipboard" size={16} color={theme.tabIconDefault} />
                <ThemedText style={styles.recommendationsTitle}>Recomendações</ThemedText>
              </View>
              {fireData.recommendations.map((rec, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <ThemedText style={styles.recommendationBullet}>•</ThemedText>
                  <ThemedText style={styles.recommendationText}>{rec}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {/* Hotspots List */}
          {fireData.activeHotspots.hotspots.length > 0 ? (
            <View style={styles.hotspotsSection}>
              <ThemedText style={styles.sectionTitle}>
                Focos Próximos ({fireData.activeHotspots.hotspots.length})
              </ThemedText>
              <ScrollView style={styles.hotspotsList} nestedScrollEnabled>
                {fireData.activeHotspots.hotspots.map((hotspot, index) => (
                  <View 
                    key={hotspot.id || index} 
                    style={[styles.hotspotCard, { backgroundColor: theme.border + "20" }]}
                  >
                    <View style={styles.hotspotHeader}>
                      <View style={[styles.hotspotNumber, { backgroundColor: "#FF5722" }]}>
                        <ThemedText style={styles.hotspotNumberText}>{index + 1}</ThemedText>
                      </View>
                      <View style={styles.hotspotInfo}>
                        <ThemedText style={styles.hotspotLocation}>
                          {hotspot.municipio || "Município N/D"} - {hotspot.estado || "UF"}
                        </ThemedText>
                        <ThemedText style={[styles.hotspotTime, { color: theme.tabIconDefault }]}>
                          {formatDateTime(hotspot.datahora)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.hotspotDetails}>
                      <View style={styles.hotspotDetail}>
                        <Feather name="map-pin" size={12} color={theme.tabIconDefault} />
                        <ThemedText style={styles.hotspotDetailText}>
                          {hotspot.latitude?.toFixed(4)}, {hotspot.longitude?.toFixed(4)}
                        </ThemedText>
                      </View>
                      {hotspot.satelite ? (
                        <View style={styles.hotspotDetail}>
                          <Feather name="radio" size={12} color={theme.tabIconDefault} />
                          <ThemedText style={styles.hotspotDetailText}>
                            {hotspot.satelite}
                          </ThemedText>
                        </View>
                      ) : null}
                      {hotspot.bioma ? (
                        <View style={styles.hotspotDetail}>
                          <Feather name="layers" size={12} color={theme.tabIconDefault} />
                          <ThemedText style={styles.hotspotDetailText}>
                            {hotspot.bioma}
                          </ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Historical Data Info */}
          <View style={[styles.historicalCard, { backgroundColor: "#E3F2FD" }]}>
            <View style={styles.historicalHeader}>
              <Feather name="database" size={16} color="#1565C0" />
              <ThemedText style={[styles.historicalTitle, { color: "#1565C0" }]}>
                Dados Históricos
              </ThemedText>
            </View>
            <ThemedText style={styles.historicalText}>
              {fireData.historical.note}
            </ThemedText>
            <ThemedText style={[styles.historicalSource, { color: theme.tabIconDefault }]}>
              Fonte: {fireData.historical.source}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
  },
  description: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  radiusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  radiusLabel: {
    fontSize: 13,
    marginRight: Spacing.sm,
  },
  radiusButtons: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  radiusButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  coordsInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  coordsText: {
    fontSize: 12,
  },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 13,
    flex: 1,
  },
  resultsContainer: {
    marginTop: Spacing.lg,
  },
  riskCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  riskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  riskInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: "700",
  },
  riskCount: {
    fontSize: 13,
    opacity: 0.8,
  },
  periodText: {
    fontSize: 12,
    opacity: 0.7,
  },
  recommendationsCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  recommendationBullet: {
    fontSize: 14,
    marginRight: Spacing.xs,
    opacity: 0.7,
  },
  recommendationText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  hotspotsSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  hotspotsList: {
    maxHeight: 200,
  },
  hotspotCard: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  hotspotHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  hotspotNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  hotspotNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  hotspotInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  hotspotLocation: {
    fontSize: 13,
    fontWeight: "600",
  },
  hotspotTime: {
    fontSize: 11,
  },
  hotspotDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginLeft: 32,
  },
  hotspotDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hotspotDetailText: {
    fontSize: 11,
    opacity: 0.8,
  },
  historicalCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  historicalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  historicalTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  historicalText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  historicalSource: {
    fontSize: 11,
  },
});
