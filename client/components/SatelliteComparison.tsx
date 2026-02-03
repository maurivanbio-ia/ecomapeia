import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface SatelliteAnalysis {
  location: { latitude: number; longitude: number };
  deterAlerts: number;
  alertDetails: Array<{
    date: string;
    area: number;
    class: string;
  }>;
  analysisDate: string;
  period: { start: string; end: string };
  sources: string[];
  recommendation: string;
}

interface SatelliteComparisonProps {
  latitude: number;
  longitude: number;
  onClose: () => void;
  visible: boolean;
}

export function SatelliteComparison({ latitude, longitude, onClose, visible }: SatelliteComparisonProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<SatelliteAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(new URL("/api/features/satellite-comparison", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude,
          longitude,
          startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || "Erro ao buscar dados de satélite");
      }
    } catch (err) {
      console.error("Satellite comparison error:", err);
      setError("Erro ao conectar com o serviço de satélite");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (visible && !analysis) {
      fetchAnalysis();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Análise de Satélite</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={Colors.light.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.accent} />
              <ThemedText style={styles.loadingText}>
                Consultando bases de dados do INPE...
              </ThemedText>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={48} color={Colors.light.error} />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
              <Pressable style={styles.retryButton} onPress={fetchAnalysis}>
                <ThemedText style={styles.retryButtonText}>Tentar novamente</ThemedText>
              </Pressable>
            </View>
          )}

          {analysis && (
            <>
              <View style={styles.locationCard}>
                <Feather name="map-pin" size={20} color={Colors.light.accent} />
                <View style={styles.locationInfo}>
                  <ThemedText style={styles.locationLabel}>Localização analisada</ThemedText>
                  <ThemedText style={styles.locationCoords}>
                    {analysis.location.latitude.toFixed(6)}, {analysis.location.longitude.toFixed(6)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.periodCard}>
                <ThemedText style={styles.periodLabel}>Período de análise</ThemedText>
                <ThemedText style={styles.periodValue}>
                  {analysis.period.start} a {analysis.period.end}
                </ThemedText>
              </View>

              <View style={[
                styles.alertsCard,
                analysis.deterAlerts > 0 ? styles.alertsCardWarning : styles.alertsCardSuccess
              ]}>
                <View style={styles.alertsHeader}>
                  <Feather 
                    name={analysis.deterAlerts > 0 ? "alert-triangle" : "check-circle"} 
                    size={32} 
                    color={analysis.deterAlerts > 0 ? Colors.light.warning : Colors.light.success} 
                  />
                  <View style={styles.alertsInfo}>
                    <ThemedText style={styles.alertsCount}>
                      {analysis.deterAlerts} {analysis.deterAlerts === 1 ? "alerta" : "alertas"}
                    </ThemedText>
                    <ThemedText style={styles.alertsLabel}>de desmatamento detectado(s)</ThemedText>
                  </View>
                </View>

                {analysis.alertDetails.length > 0 && (
                  <View style={styles.alertDetails}>
                    <ThemedText style={styles.alertDetailsTitle}>Detalhes dos alertas:</ThemedText>
                    {analysis.alertDetails.map((alert, index) => (
                      <View key={index} style={styles.alertItem}>
                        <ThemedText style={styles.alertDate}>{alert.date}</ThemedText>
                        <ThemedText style={styles.alertClass}>{alert.class}</ThemedText>
                        <ThemedText style={styles.alertArea}>{alert.area?.toFixed(2)} km²</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.recommendationCard}>
                <Feather name="info" size={20} color={Colors.light.accent} />
                <ThemedText style={styles.recommendationText}>
                  {analysis.recommendation}
                </ThemedText>
              </View>

              <View style={styles.sourcesCard}>
                <ThemedText style={styles.sourcesLabel}>Fontes de dados:</ThemedText>
                <View style={styles.sourcesList}>
                  {analysis.sources.map((source, index) => (
                    <View key={index} style={styles.sourceTag}>
                      <ThemedText style={styles.sourceText}>{source}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable style={styles.refreshButton} onPress={fetchAnalysis}>
                <Feather name="refresh-cw" size={18} color={Colors.light.accent} />
                <ThemedText style={styles.refreshButtonText}>Atualizar análise</ThemedText>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    alignItems: "center",
    padding: Spacing.xxl,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: Spacing.xxl,
  },
  errorText: {
    fontSize: 14,
    color: Colors.light.error,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  locationCoords: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  periodCard: {
    padding: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  periodLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  periodValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  alertsCard: {
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  alertsCardWarning: {
    backgroundColor: Colors.light.warning + "15",
    borderWidth: 1,
    borderColor: Colors.light.warning + "40",
  },
  alertsCardSuccess: {
    backgroundColor: Colors.light.success + "15",
    borderWidth: 1,
    borderColor: Colors.light.success + "40",
  },
  alertsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertsInfo: {
    flex: 1,
  },
  alertsCount: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.light.text,
  },
  alertsLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  alertDetails: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.light.warning + "30",
  },
  alertDetailsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  alertDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  alertClass: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: "500",
  },
  alertArea: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  recommendationCard: {
    flexDirection: "row",
    gap: 12,
    padding: Spacing.md,
    backgroundColor: Colors.light.accent + "10",
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  sourcesCard: {
    padding: Spacing.md,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  sourcesLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  sourcesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sourceTag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.light.accent + "20",
    borderRadius: 12,
  },
  sourceText: {
    fontSize: 12,
    color: Colors.light.accent,
    fontWeight: "500",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
  },
  refreshButtonText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "600",
  },
});
