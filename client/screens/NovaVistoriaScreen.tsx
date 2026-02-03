import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const MARGEM_OPTIONS = ["DIREITA", "ESQUERDA"];
const TIPO_INSPECAO_OPTIONS = ["CADASTRAMENTO", "MONITORAMENTO", "FISCALIZAÇÃO"];
const SIM_NAO_OPTIONS = ["SIM", "NÃO"];
const TIPO_INTERVENCAO_OPTIONS = [
  "NA",
  "USO IRREGULAR",
  "OCUPAÇÃO IRREGULAR",
  "USOS IRREGULARES",
];
const STATUS_OPTIONS = ["NÃO EXECUTADO", "EM ANDAMENTO", "EXECUTADO"];

interface FormData {
  numero_notificacao: string;
  setor: string;
  margem: string;
  municipio: string;
  numero_confrontante: string;
  proprietario: string;
  loteamento_condominio: string;
  tipo_inspecao: string;
  data_vistoria: string;
  comodatario: string;
  contrato_vigente: string;
  zona_utm: string;
  coord_utm_e_inicial: string;
  coord_utm_s_inicial: string;
  coord_utm_e_final: string;
  coord_utm_s_final: string;
  tipo_intervencao: string;
  intervencao: string;
  detalhamento_intervencao: string;
  emissao_notificacao: string;
  reincidente: string;
  observacoes: string;
}

export default function NovaVistoriaScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];

  const [formData, setFormData] = useState<FormData>({
    numero_notificacao: "",
    setor: "",
    margem: "DIREITA",
    municipio: "",
    numero_confrontante: "",
    proprietario: "",
    loteamento_condominio: "",
    tipo_inspecao: "CADASTRAMENTO",
    data_vistoria: today,
    comodatario: "NÃO",
    contrato_vigente: "NÃO",
    zona_utm: "23K",
    coord_utm_e_inicial: "",
    coord_utm_s_inicial: "",
    coord_utm_e_final: "",
    coord_utm_s_final: "",
    tipo_intervencao: "NA",
    intervencao: "",
    detalhamento_intervencao: "",
    emissao_notificacao: "NÃO",
    reincidente: "NÃO",
    observacoes: "",
  });

  const createVistoria = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/vistorias", {
        ...data,
        usuario_id: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vistorias?usuario_id=${user?.id}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Sucesso", "Vistoria criada com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error) => {
      console.error("Error creating vistoria:", error);
      Alert.alert("Erro", "Não foi possível criar a vistoria. Tente novamente.");
    },
  });

  const handleSubmit = () => {
    if (!formData.proprietario.trim()) {
      Alert.alert("Erro", "O campo Proprietário é obrigatório.");
      return;
    }
    if (!formData.data_vistoria) {
      Alert.alert("Erro", "A data da vistoria é obrigatória.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createVistoria.mutate(formData);
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderInput = (
    label: string,
    field: keyof FormData,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: "default" | "numeric";
    }
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
            color: theme.text,
          },
          options?.multiline && styles.multilineInput,
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.tabIconDefault}
        value={formData[field]}
        onChangeText={(value) => updateField(field, value)}
        multiline={options?.multiline}
        keyboardType={options?.keyboardType || "default"}
      />
    </View>
  );

  const renderSelect = (
    label: string,
    field: keyof FormData,
    options: string[]
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.selectRow}>
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              Haptics.selectionAsync();
              updateField(field, option);
            }}
            style={[
              styles.selectOption,
              {
                backgroundColor:
                  formData[field] === option
                    ? Colors.light.primary
                    : theme.backgroundDefault,
                borderColor:
                  formData[field] === option
                    ? Colors.light.primary
                    : theme.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.selectText,
                {
                  color:
                    formData[field] === option ? "#FFFFFF" : theme.text,
                },
              ]}
            >
              {option}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["4xl"],
          },
        ]}
      >
        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="file-text" size={18} /> Identificação
          </ThemedText>

          {renderInput("Nº Notificação", "numero_notificacao", "Ex: 0001/26")}
          {renderInput("Setor", "setor", "Ex: 1 A 3")}
          {renderSelect("Margem", "margem", MARGEM_OPTIONS)}
          {renderInput("Município", "municipio", "Ex: VOTORANTIM")}
          {renderInput("Nº Confrontante", "numero_confrontante", "Ex: 0001/26")}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="user" size={18} /> Proprietário
          </ThemedText>

          {renderInput("Proprietário *", "proprietario", "Nome do proprietário")}
          {renderInput("Loteamento / Condomínio", "loteamento_condominio", "Nome do loteamento")}
          {renderSelect("Comodatário", "comodatario", SIM_NAO_OPTIONS)}
          {renderSelect("Contrato Vigente", "contrato_vigente", SIM_NAO_OPTIONS)}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="clipboard" size={18} /> Inspeção
          </ThemedText>

          {renderSelect("Tipo de Inspeção", "tipo_inspecao", TIPO_INSPECAO_OPTIONS)}
          {renderInput("Data da Vistoria", "data_vistoria", "YYYY-MM-DD")}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="map-pin" size={18} /> Coordenadas UTM
          </ThemedText>

          {renderInput("Zona UTM", "zona_utm", "Ex: 23K")}
          
          <ThemedText style={styles.subLabel}>Ponto Inicial</ThemedText>
          <View style={styles.coordRow}>
            <View style={styles.coordInput}>
              {renderInput("E (Leste)", "coord_utm_e_inicial", "Ex: 255490", { keyboardType: "numeric" })}
            </View>
            <View style={styles.coordInput}>
              {renderInput("S (Sul)", "coord_utm_s_inicial", "Ex: 7386829", { keyboardType: "numeric" })}
            </View>
          </View>

          <ThemedText style={styles.subLabel}>Ponto Final</ThemedText>
          <View style={styles.coordRow}>
            <View style={styles.coordInput}>
              {renderInput("E (Leste)", "coord_utm_e_final", "Ex: 255485", { keyboardType: "numeric" })}
            </View>
            <View style={styles.coordInput}>
              {renderInput("S (Sul)", "coord_utm_s_final", "Ex: 7386825", { keyboardType: "numeric" })}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="alert-triangle" size={18} /> Intervenção
          </ThemedText>

          {renderSelect("Tipo de Intervenção", "tipo_intervencao", TIPO_INTERVENCAO_OPTIONS)}
          {renderInput("Intervenção", "intervencao", "Ex: PASTAGEM; AVANÇO DE CERCA")}
          {renderInput("Detalhamento", "detalhamento_intervencao", "Descreva a intervenção...", { multiline: true })}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="bell" size={18} /> Notificação
          </ThemedText>

          {renderSelect("Emissão de Notificação", "emissao_notificacao", SIM_NAO_OPTIONS)}
          {renderSelect("Reincidente", "reincidente", SIM_NAO_OPTIONS)}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="edit-3" size={18} /> Observações
          </ThemedText>

          {renderInput("Observações Gerais", "observacoes", "Observações adicionais...", { multiline: true })}
        </View>

        <Pressable
          onPress={handleSubmit}
          disabled={createVistoria.isPending}
          style={({ pressed }) => [
            styles.submitButton,
            {
              opacity: pressed || createVistoria.isPending ? 0.8 : 1,
              backgroundColor: Colors.light.accent,
            },
          ]}
        >
          {createVistoria.isPending ? (
            <ThemedText style={styles.submitText}>Salvando...</ThemedText>
          ) : (
            <>
              <Feather name="save" size={20} color="#FFFFFF" />
              <ThemedText style={styles.submitText}>Salvar Vistoria</ThemedText>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.lg,
    color: Colors.light.primary,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  subLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
    color: Colors.light.primary,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  selectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  selectOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  selectText: {
    fontSize: 13,
    fontWeight: "500",
  },
  coordRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  coordInput: {
    flex: 1,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
