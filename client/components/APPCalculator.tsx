import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { Colors, Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface APPResult {
  tipoRecurso: string;
  larguraRecurso?: number;
  faixaAPP: number;
  fundamentoLegal: string;
  observacoes?: string;
}

interface APPCalculatorProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (result: APPResult) => void;
}

const TIPOS_RECURSO = [
  { value: "curso_dagua", label: "Curso d'água" },
  { value: "nascente", label: "Nascente/Olho d'água" },
  { value: "lago_lagoa_natural", label: "Lago/Lagoa natural" },
  { value: "reservatorio_artificial", label: "Reservatório artificial" },
  { value: "encosta", label: "Encosta" },
  { value: "topo_morro", label: "Topo de morro" },
  { value: "vereda", label: "Vereda" },
  { value: "manguezal", label: "Manguezal" },
  { value: "restinga", label: "Restinga" },
];

export function APPCalculator({ visible, onClose, onResult }: APPCalculatorProps) {
  const [tipoRecurso, setTipoRecurso] = useState("");
  const [larguraRecurso, setLarguraRecurso] = useState("");
  const [inclinacao, setInclinacao] = useState("");
  const [altitudeTopoMorro, setAltitudeTopoMorro] = useState("");
  const [areaPropriedade, setAreaPropriedade] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<APPResult | null>(null);

  const calculate = async () => {
    if (!tipoRecurso) return;

    setLoading(true);
    try {
      const response = await fetch(new URL("/api/features/calculate-app", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipoRecurso,
          larguraRecurso: larguraRecurso ? parseFloat(larguraRecurso) : undefined,
          inclinacao: inclinacao ? parseFloat(inclinacao) : undefined,
          altitudeTopoMorro: altitudeTopoMorro ? parseFloat(altitudeTopoMorro) : undefined,
          areaPropriedade: areaPropriedade ? parseFloat(areaPropriedade) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.calculation);
        if (onResult) onResult(data.calculation);
      }
    } catch (error) {
      console.error("Error calculating APP:", error);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setTipoRecurso("");
    setLarguraRecurso("");
    setInclinacao("");
    setAltitudeTopoMorro("");
    setAreaPropriedade("");
    setResult(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText style={styles.title}>Calculadora de APP</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={Colors.light.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <ThemedText style={styles.subtitle}>
            Calcule a Área de Preservação Permanente conforme a Lei 12.651/2012
          </ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Tipo de Recurso</ThemedText>
            <View style={styles.optionsContainer}>
              {TIPOS_RECURSO.map((tipo) => (
                <Pressable
                  key={tipo.value}
                  style={[
                    styles.option,
                    tipoRecurso === tipo.value && styles.optionSelected,
                  ]}
                  onPress={() => setTipoRecurso(tipo.value)}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      tipoRecurso === tipo.value && styles.optionTextSelected,
                    ]}
                  >
                    {tipo.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          {tipoRecurso === "curso_dagua" && (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Largura do curso d'água (metros)</ThemedText>
              <TextInput
                style={styles.input}
                value={larguraRecurso}
                onChangeText={setLarguraRecurso}
                keyboardType="numeric"
                placeholder="Ex: 15"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          )}

          {tipoRecurso === "encosta" && (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Inclinação (graus)</ThemedText>
              <TextInput
                style={styles.input}
                value={inclinacao}
                onChangeText={setInclinacao}
                keyboardType="numeric"
                placeholder="Ex: 50"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          )}

          {tipoRecurso === "topo_morro" && (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Altitude do topo (metros)</ThemedText>
              <TextInput
                style={styles.input}
                value={altitudeTopoMorro}
                onChangeText={setAltitudeTopoMorro}
                keyboardType="numeric"
                placeholder="Ex: 150"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          )}

          {tipoRecurso === "lago_lagoa_natural" && (
            <View style={styles.field}>
              <ThemedText style={styles.label}>Área da propriedade (módulos fiscais)</ThemedText>
              <TextInput
                style={styles.input}
                value={areaPropriedade}
                onChangeText={setAreaPropriedade}
                keyboardType="numeric"
                placeholder="Ex: 2"
                placeholderTextColor={Colors.light.textSecondary}
              />
            </View>
          )}

          <Pressable
            style={[styles.calculateButton, !tipoRecurso && styles.buttonDisabled]}
            onPress={calculate}
            disabled={!tipoRecurso || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="calculator" size={20} color="#fff" />
                <ThemedText style={styles.buttonText}>Calcular APP</ThemedText>
              </>
            )}
          </Pressable>

          {result && (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <Feather name="check-circle" size={24} color={Colors.light.success} />
                <ThemedText style={styles.resultTitle}>Resultado</ThemedText>
              </View>

              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <ThemedText style={styles.resultLabel}>Tipo:</ThemedText>
                  <ThemedText style={styles.resultValue}>{result.tipoRecurso}</ThemedText>
                </View>

                <View style={styles.resultRow}>
                  <ThemedText style={styles.resultLabel}>Faixa de APP:</ThemedText>
                  <ThemedText style={styles.resultValueHighlight}>
                    {result.faixaAPP > 0 ? `${result.faixaAPP} metros` : "Área integral"}
                  </ThemedText>
                </View>

                <View style={styles.resultRow}>
                  <ThemedText style={styles.resultLabel}>Fundamento:</ThemedText>
                  <ThemedText style={styles.resultValue}>{result.fundamentoLegal}</ThemedText>
                </View>

                {result.observacoes && (
                  <View style={styles.observacoesContainer}>
                    <ThemedText style={styles.observacoesText}>{result.observacoes}</ThemedText>
                  </View>
                )}
              </View>

              <Pressable style={styles.resetButton} onPress={reset}>
                <Feather name="refresh-cw" size={18} color={Colors.light.accent} />
                <ThemedText style={styles.resetButtonText}>Novo cálculo</ThemedText>
              </Pressable>
            </View>
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
  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.xl,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  optionSelected: {
    backgroundColor: Colors.light.accent + "20",
    borderColor: Colors.light.accent,
  },
  optionText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  optionTextSelected: {
    color: Colors.light.accent,
    fontWeight: "600",
  },
  calculateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.accent,
    padding: 16,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  resultContainer: {
    marginTop: Spacing.xl,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.md,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.light.text,
  },
  resultCard: {
    backgroundColor: Colors.light.success + "10",
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.light.success + "30",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  resultValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  resultValueHighlight: {
    fontSize: 16,
    color: Colors.light.success,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  observacoesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.success + "30",
  },
  observacoesText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    fontStyle: "italic",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    marginTop: Spacing.md,
  },
  resetButtonText: {
    fontSize: 14,
    color: Colors.light.accent,
    fontWeight: "600",
  },
});
