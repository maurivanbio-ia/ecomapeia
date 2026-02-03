import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { generateReportSummary, ReportSummary, getAreaStatusColor } from "@/lib/aiUtils";

interface AIReportGeneratorProps {
  vistoria: Record<string, unknown>;
  fotos?: unknown[];
  coordenadas?: unknown[];
  onReportGenerated?: (summary: ReportSummary) => void;
  theme: any;
}

export function AIReportGenerator({
  vistoria,
  fotos,
  coordenadas,
  onReportGenerated,
  theme,
}: AIReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateReportSummary(vistoria, fotos, coordenadas);
      setSummary(result);
      onReportGenerated?.(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setError("Falha ao gerar relatório. Tente novamente.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!summary) {
    return (
      <View style={styles.container}>
        <Pressable
          onPress={handleGenerate}
          disabled={isGenerating}
          style={[styles.generateButton, { backgroundColor: Colors.light.accent }]}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <ThemedText style={styles.buttonText}>Gerando relatório...</ThemedText>
            </>
          ) : (
            <>
              <Feather name="file-text" size={20} color="#FFFFFF" />
              <ThemedText style={styles.buttonText}>Gerar Relatório com IA</ThemedText>
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
      style={[styles.reportContainer, { backgroundColor: theme.backgroundDefault }]}
    >
      <View style={styles.reportHeader}>
        <View style={[styles.aiIcon, { backgroundColor: Colors.light.accent + "20" }]}>
          <Feather name="file-text" size={16} color={Colors.light.accent} />
        </View>
        <ThemedText style={styles.reportTitle}>Relatório IA</ThemedText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getAreaStatusColor(summary.classificacaoArea) + "20" },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: getAreaStatusColor(summary.classificacaoArea) },
            ]}
          >
            {summary.classificacaoArea.replace("_", " ")}
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Resumo Executivo</ThemedText>
        <ThemedText style={styles.sectionText}>{summary.resumoExecutivo}</ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Conclusão Técnica</ThemedText>
        <ThemedText style={styles.sectionText}>{summary.conclusaoTecnica}</ThemedText>
      </View>

      {summary.recomendacoes.length > 0 ? (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Recomendações</ThemedText>
          {summary.recomendacoes.map((item, index) => (
            <View key={index} style={styles.listItem}>
              <ThemedText style={styles.listNumber}>{index + 1}.</ThemedText>
              <ThemedText style={styles.listText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.section, styles.parecerSection]}>
        <ThemedText style={styles.sectionTitle}>Parecer Final</ThemedText>
        <ThemedText style={[styles.sectionText, styles.parecerText]}>
          {summary.parecerFinal}
        </ThemedText>
      </View>

      <Pressable
        onPress={() => setSummary(null)}
        style={[styles.regenerateButton, { borderColor: theme.border }]}
      >
        <Feather name="refresh-cw" size={16} color={theme.text} />
        <ThemedText style={styles.regenerateText}>Regenerar Relatório</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  errorText: {
    color: Colors.light.error,
    fontSize: 13,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  reportContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    color: Colors.light.accent,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  listItem: {
    flexDirection: "row",
    marginTop: 6,
  },
  listNumber: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: Spacing.sm,
    minWidth: 20,
  },
  listText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  parecerSection: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  parecerText: {
    fontStyle: "italic",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  regenerateText: {
    fontSize: 14,
  },
});
