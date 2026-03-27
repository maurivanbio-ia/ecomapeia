import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Image,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VistoriasStackParamList } from "@/navigation/VistoriasStackNavigator";
import { useAuth } from "@/hooks/useAuth";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import MapPolygonView from "@/components/MapPolygonView";

interface RouteParams {
  vistoriaId: string;
}

interface WeatherData {
  temperatura?: number;
  umidade?: number;
  condicoes?: string;
  velocidade_vento?: number;
  direcao_vento?: string;
  nebulosidade?: number;
}

interface VistoriaData {
  id: string;
  numero_notificacao?: string;
  setor?: string;
  margem?: string;
  municipio?: string;
  uf?: string;
  proprietario?: string;
  loteamento_condominio?: string;
  tipo_inspecao?: string;
  data_vistoria?: string;
  hora_vistoria?: string;
  zona_utm?: string;
  tipo_intervencao?: string;
  intervencao?: string;
  detalhamento_intervencao?: string;
  observacoes?: string;
  status_upload?: string;
  coordenadas_utm?: Array<{ e: string; n: string }>;
  coordenadas?: Array<{ latitude: number; longitude: number; ordem: number }>;
  usosSolo?: Array<{ tipo: string; valor?: string; unidade?: string }>;
  fotos?: Array<{ uri: string; legenda?: string }>;
  carInfo?: any;
  embargoCheck?: any;
  complianceAnalysis?: any;
  horaVistoria?: string;
  weatherData?: WeatherData;
  weather_data?: WeatherData;
  projeto_nome?: string;
}

interface LatLng {
  latitude: number;
  longitude: number;
}

async function uriToBase64DataUri(uri: string): Promise<string> {
  if (!uri) return uri;
  if (uri.startsWith("data:")) return uri;
  if (Platform.OS === "web") return uri;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split(".").pop()?.toLowerCase() || "jpeg";
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch {
    return uri;
  }
}

async function preparePhotosForReport(
  fotos?: Array<{ uri: string; legenda?: string }>
): Promise<Array<{ uri: string; legenda?: string }>> {
  if (!fotos?.length) return fotos || [];
  return Promise.all(
    fotos.map(async (foto) => ({
      ...foto,
      uri: await uriToBase64DataUri(foto.uri),
    }))
  );
}

async function prepareUriForReport(uri?: string | null): Promise<string | null | undefined> {
  if (!uri) return uri;
  return uriToBase64DataUri(uri);
}

function utmToLatLng(easting: number, northing: number, zone: number, isNorth: boolean): LatLng {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const falseEasting = 500000;
  const falseNorthing = isNorth ? 0 : 10000000;

  const x = easting - falseEasting;
  const y = northing - falseNorthing;

  const M = y / k0;
  const mu = M / (a * (1 - Math.pow(e, 2) / 4 - 3 * Math.pow(e, 4) / 64 - 5 * Math.pow(e, 6) / 256));

  const e1 = (1 - Math.sqrt(1 - Math.pow(e, 2))) / (1 + Math.sqrt(1 - Math.pow(e, 2)));
  const J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32);
  const J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32);
  const J3 = (151 * Math.pow(e1, 3) / 96);
  const J4 = (1097 * Math.pow(e1, 4) / 512);

  const fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

  const C1 = e1sq * Math.pow(Math.cos(fp), 2);
  const T1 = Math.pow(Math.tan(fp), 2);
  const R1 = a * (1 - Math.pow(e, 2)) / Math.pow(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2), 1.5);
  const N1 = a / Math.sqrt(1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2));
  const D = x / (N1 * k0);

  const Q1 = N1 * Math.tan(fp) / R1;
  const Q2 = Math.pow(D, 2) / 2;
  const Q3 = (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e1sq) * Math.pow(D, 4) / 24;
  const Q4 = (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 252 * e1sq - 3 * Math.pow(C1, 2)) * Math.pow(D, 6) / 720;

  const lat = fp - Q1 * (Q2 - Q3 + Q4);

  const Q5 = D;
  const Q6 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
  const Q7 = (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e1sq + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120;

  const lng0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const lng = lng0 + (Q5 - Q6 + Q7) / Math.cos(fp);

  return {
    latitude: lat * 180 / Math.PI,
    longitude: lng * 180 / Math.PI,
  };
}

export default function DetalhesVistoriaScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<VistoriasStackParamList>>();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { vistoriaId } = route.params as RouteParams;
  const [mapImageUri, setMapImageUri] = useState<string | null>(null);

  const { data: vistoria, isLoading } = useQuery<VistoriaData>({
    queryKey: [`/api/vistorias/${vistoriaId}`],
  });

  const deleteVistoria = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/vistorias/${vistoriaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/vistorias?usuario_id=${user?.id}`] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: (error) => {
      console.error("Error deleting vistoria:", error);
      Alert.alert("Erro", "Não foi possível excluir a vistoria.");
    },
  });

  const handleEdit = () => {
    navigation.navigate("NovaVistoria", { editVistoriaId: vistoriaId });
  };

  const handleDelete = () => {
    Alert.alert(
      "Excluir Vistoria",
      "Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteVistoria.mutate(),
        },
      ]
    );
  };

  const generatePDF = async () => {
    if (!vistoria) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const [preparedFotos, preparedCroqui, preparedSig, preparedSigTec] = await Promise.all([
        preparePhotosForReport(vistoria.fotos),
        prepareUriForReport((vistoria as any).croqui_imagem || mapImageUri),
        prepareUriForReport((vistoria as any).assinatura_uri),
        prepareUriForReport((vistoria as any).assinatura_tecnico_uri),
      ]);

      const pdfData = {
        ...vistoria,
        fotos: preparedFotos,
        croqui_imagem: preparedCroqui,
        assinatura_uri: preparedSig,
        assinatura_tecnico_uri: preparedSigTec,
        carInfo: vistoria.carInfo || (vistoria as any).car_info,
        embargoCheck: vistoria.embargoCheck || (vistoria as any).embargo_check,
        complianceAnalysis: vistoria.complianceAnalysis || (vistoria as any).compliance_analysis,
        weather_data: vistoria.weatherData || vistoria.weather_data,
        hora_vistoria: vistoria.horaVistoria || vistoria.hora_vistoria,
        usos_solo: vistoria.usosSolo,
        coordenadas_utm: vistoria.coordenadas_utm || vistoria.coordenadas?.map((c) => ({
          e: c.latitude?.toFixed(6) || "",
          n: c.longitude?.toFixed(6) || ""
        })),
      };
      
      const response = await apiRequest("POST", "/api/pdf/generate", pdfData);
      const html = await response.text();

      if (Platform.OS === "web") {
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
        }
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Compartilhar Relatório PDF",
          });
        }
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error generating PDF:", error);
      Alert.alert("Erro", "Não foi possível gerar o relatório PDF.");
    }
  };

  const generateWord = async () => {
    if (!vistoria) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const [preparedFotos, preparedCroqui, preparedSig, preparedSigTec] = await Promise.all([
        preparePhotosForReport(vistoria.fotos),
        prepareUriForReport((vistoria as any).croqui_imagem || mapImageUri),
        prepareUriForReport((vistoria as any).assinatura_uri),
        prepareUriForReport((vistoria as any).assinatura_tecnico_uri),
      ]);

      const wordData = {
        ...vistoria,
        fotos: preparedFotos,
        croqui_imagem: preparedCroqui,
        assinatura_uri: preparedSig,
        assinatura_tecnico_uri: preparedSigTec,
        usos_solo: vistoria.usosSolo,
      };
      
      const apiUrl = getApiUrl();
      const url = new URL("/api/docx/generate", apiUrl);
      
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wordData),
      });

      if (!response.ok) {
        throw new Error("Failed to generate Word document");
      }

      if (Platform.OS === "web") {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `RO-NOT-ITU_${vistoria.numero_notificacao?.replace(/[^a-zA-Z0-9]/g, "_") || vistoria.id}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        Alert.alert(
          "Documento Word",
          "O documento Word está disponível para download na versão web. Acesse a aplicação pelo navegador para baixar o arquivo.",
          [{ text: "OK" }]
        );
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error generating Word document:", error);
      Alert.alert("Erro", "Não foi possível gerar o documento Word.");
    }
  };

  const polygonCoordinates = React.useMemo(() => {
    if (!vistoria?.coordenadas_utm) return [];

    const zoneMatch = (vistoria.zona_utm || "23K").match(/(\d+)([A-Za-z])/);
    if (!zoneMatch) return [];

    const zone = parseInt(zoneMatch[1], 10);
    const zoneLetter = zoneMatch[2].toUpperCase();
    const isNorth = zoneLetter >= "N";

    const coords: LatLng[] = [];
    for (const point of vistoria.coordenadas_utm) {
      const e = parseFloat(point.e);
      const n = parseFloat(point.n);
      if (!isNaN(e) && !isNaN(n) && e > 0 && n > 0) {
        try {
          const latLng = utmToLatLng(e, n, zone, isNorth);
          coords.push(latLng);
        } catch (err) {
          console.warn("Error converting UTM:", err);
        }
      }
    }
    return coords;
  }, [vistoria]);

  const mapRegion = React.useMemo(() => {
    if (polygonCoordinates.length === 0) {
      return { latitude: -23.5, longitude: -47.4, latitudeDelta: 0.5, longitudeDelta: 0.5 };
    }

    const lats = polygonCoordinates.map((c) => c.latitude);
    const lngs = polygonCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.005),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.005),
    };
  }, [polygonCoordinates]);

  const renderField = (label: string, value?: string | null) => (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={styles.fieldValue}>{value || "-"}</ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Carregando...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!vistoria) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Vistoria não encontrada</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing["4xl"],
          },
        ]}
      >
        <View style={styles.headerActions}>
          <Pressable
            onPress={generatePDF}
            style={[styles.actionBtn, { backgroundColor: Colors.light.primary }]}
          >
            <Feather name="file-text" size={18} color="#FFFFFF" />
            <ThemedText style={styles.actionBtnText}>PDF</ThemedText>
          </Pressable>
          <Pressable
            onPress={generateWord}
            style={[styles.actionBtn, { backgroundColor: Colors.light.accent }]}
          >
            <Feather name="file" size={18} color="#FFFFFF" />
            <ThemedText style={styles.actionBtnText}>Word</ThemedText>
          </Pressable>
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="file-text" size={18} /> Identificação
          </ThemedText>
          <View style={styles.fieldGrid}>
            {renderField("Nº Notificação", vistoria.numero_notificacao)}
            {renderField("Setor", vistoria.setor)}
            {renderField("Margem", vistoria.margem)}
            {renderField("Município", vistoria.municipio)}
          </View>
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
          {renderField("Nome", vistoria.proprietario)}
          {renderField("Loteamento/Condomínio", vistoria.loteamento_condominio)}
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
          <View style={styles.fieldGrid}>
            {renderField("Tipo", vistoria.tipo_inspecao)}
            {renderField("Data", vistoria.data_vistoria)}
          </View>
        </View>

        {polygonCoordinates.length >= 3 ? (
          <View
            style={[
              styles.section,
              { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
            ]}
          >
            <ThemedText style={styles.sectionTitle}>
              <Feather name="map-pin" size={18} /> Localização
            </ThemedText>
            <MapPolygonView
              polygonCoordinates={polygonCoordinates}
              mapRegion={mapRegion}
              onMapImageCaptured={setMapImageUri}
              mapImageUri={mapImageUri}
            />
          </View>
        ) : null}

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="alert-triangle" size={18} /> Intervenção
          </ThemedText>
          {renderField("Tipo", vistoria.tipo_intervencao)}
          {renderField("Intervenção", vistoria.intervencao)}
          {renderField("Detalhamento", vistoria.detalhamento_intervencao)}
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
          <ThemedText style={styles.observacoes}>
            {vistoria.observacoes || "Nenhuma observação registrada"}
          </ThemedText>
        </View>

        <View style={styles.statusBadge}>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  vistoria.status_upload === "synced"
                    ? Colors.light.accent
                    : Colors.light.warning,
              },
            ]}
          >
            <Feather
              name={vistoria.status_upload === "synced" ? "check-circle" : "clock"}
              size={14}
              color="#FFFFFF"
            />
            <ThemedText style={styles.badgeText}>
              {vistoria.status_upload === "synced" ? "Sincronizado" : "Pendente"}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
  fieldGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  field: {
    minWidth: "45%",
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.light.primary,
    textTransform: "uppercase",
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    fontSize: 15,
  },
  observacoes: {
    fontSize: 14,
    lineHeight: 22,
  },
  statusBadge: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
  },
});
