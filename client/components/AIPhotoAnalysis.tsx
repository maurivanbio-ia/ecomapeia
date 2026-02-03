import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { analyzePhoto, PhotoAnalysis, getRiskColor } from "@/lib/aiUtils";

interface AIPhotoAnalysisProps {
  imageBase64: string;
  onAnalysisComplete?: (analysis: PhotoAnalysis) => void;
  theme: any;
}

export function AIPhotoAnalysis({ imageBase64, onAnalysisComplete, theme }: AIPhotoAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!imageBase64 || isAnalyzing) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzePhoto(imageBase64);
      setAnalysis(result);
      onAnalysisComplete?.(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Falha ao analisar imagem. Tente novamente.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!analysis) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={handleAnalyze}
          disabled={isAnalyzing}
          style={[styles.analyzeButton, { backgroundColor: Colors.light.accent }]}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <ThemedText style={styles.buttonText}>Analisando com IA...</ThemedText>
            </>
          ) : (
            <>
              <Feather name="cpu" size={20} color="#FFFFFF" />
              <ThemedText style={styles.buttonText}>Analisar com IA</ThemedText>
            </>
          )}
        </Pressable>
        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.analysisContainer, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.analysisHeader}>
        <View style={[styles.aiIcon, { backgroundColor: Colors.light.accent + "20" }]}>
          <Feather name="cpu" size={16} color={Colors.light.accent} />
        </View>
        <ThemedText style={styles.analysisTitle}>Análise IA</ThemedText>
        <View
          style={[
            styles.riskBadge,
            { backgroundColor: getRiskColor(analysis.classificacaoRisco) + "20" },
          ]}
        >
          <View
            style={[
              styles.riskDot,
              { backgroundColor: getRiskColor(analysis.classificacaoRisco) },
            ]}
          />
          <ThemedText
            style={[
              styles.riskText,
              { color: getRiskColor(analysis.classificacaoRisco) },
            ]}
          >
            Risco {analysis.classificacaoRisco}
          </ThemedText>
        </View>
      </View>

      <View style={styles.analysisRow}>
        <ThemedText style={styles.label}>Vegetação:</ThemedText>
        <ThemedText style={styles.value}>{analysis.tipoVegetacao}</ThemedText>
      </View>

      <View style={styles.analysisRow}>
        <ThemedText style={styles.label}>Uso do Solo:</ThemedText>
        <ThemedText style={styles.value}>{analysis.usoSolo}</ThemedText>
      </View>

      {analysis.irregularidades.length > 0 ? (
        <View style={styles.analysisSection}>
          <ThemedText style={styles.label}>Irregularidades:</ThemedText>
          {analysis.irregularidades.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Feather name="alert-circle" size={14} color={Colors.light.error} />
              <ThemedText style={styles.listText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.analysisSection}>
        <ThemedText style={styles.label}>Observações:</ThemedText>
        <ThemedText style={styles.observationText}>{analysis.observacoes}</ThemedText>
      </View>

      {analysis.recomendacoes.length > 0 ? (
        <View style={styles.analysisSection}>
          <ThemedText style={styles.label}>Recomendações:</ThemedText>
          {analysis.recomendacoes.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <Feather name="check-circle" size={14} color={Colors.light.success} />
              <ThemedText style={styles.listText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => setAnalysis(null)}
        style={[styles.reanalyzeButton, { borderColor: theme.border }]}
      >
        <Feather name="refresh-cw" size={16} color={theme.text} />
        <ThemedText style={styles.reanalyzeText}>Reanalisar</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  analysisContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  analysisRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginRight: Spacing.sm,
    minWidth: 100,
  },
  value: {
    fontSize: 13,
    flex: 1,
  },
  analysisSection: {
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
    marginTop: 4,
    paddingLeft: Spacing.sm,
  },
  listText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  observationText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  reanalyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  reanalyzeText: {
    fontSize: 14,
  },
});
