import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import MapPolygonView from "@/components/MapPolygonView";
import DatePickerField from "@/components/DatePickerField";
import SignatureCapture from "@/components/SignatureCapture";
import { captureCurrentUTM, requestLocationPermission } from "@/lib/gpsUtils";
import { saveVistoriaOffline } from "@/lib/offlineStorage";

const MARGEM_OPTIONS = ["DIREITA", "ESQUERDA"];
const TIPO_INSPECAO_OPTIONS = ["CADASTRAMENTO", "MONITORAMENTO", "FISCALIZAÇÃO"];
const SIM_NAO_OPTIONS = ["SIM", "NÃO"];
const TIPO_INTERVENCAO_OPTIONS = [
  "NA",
  "USO IRREGULAR",
  "OCUPAÇÃO IRREGULAR",
  "USOS IRREGULARES",
];

interface UsoSolo {
  tipo: string;
  valor: string;
  unidade: string;
  checked: boolean;
}

interface FormData {
  numero_notificacao: string;
  setor: string;
  margem: string;
  municipio: string;
  uf: string;
  localizacao: string;
  numero_confrontante: string;
  proprietario: string;
  loteamento_condominio: string;
  tipo_inspecao: string;
  data_vistoria: string;
  comodatario: string;
  contrato_vigente: string;
  zona_utm: string;
  tipo_intervencao: string;
  intervencao: string;
  detalhamento_intervencao: string;
  emissao_notificacao: string;
  reincidente: string;
  observacoes: string;
  observacoes_usos: string;
}

interface UTMPoint {
  id: string;
  e: string;
  n: string;
}

interface Photo {
  id: string;
  uri: string;
  legenda: string;
}

interface LatLng {
  latitude: number;
  longitude: number;
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
    uf: "SP",
    localizacao: "",
    numero_confrontante: "",
    proprietario: "",
    loteamento_condominio: "",
    tipo_inspecao: "CADASTRAMENTO",
    data_vistoria: today,
    comodatario: "NÃO",
    contrato_vigente: "NÃO",
    zona_utm: "23K",
    tipo_intervencao: "NA",
    intervencao: "",
    detalhamento_intervencao: "",
    emissao_notificacao: "NÃO",
    reincidente: "NÃO",
    observacoes: "",
    observacoes_usos: "",
  });

  const [usosSolo, setUsosSolo] = useState<UsoSolo[]>([
    { tipo: "Acesso", valor: "", unidade: "m²", checked: false },
    { tipo: "Edificação", valor: "", unidade: "m²", checked: false },
    { tipo: "Píer fixo", valor: "", unidade: "m²", checked: false },
    { tipo: "Píer Flutuante", valor: "", unidade: "m²", checked: false },
    { tipo: "Área de Lazer", valor: "", unidade: "m²", checked: false },
    { tipo: "Praia artificial", valor: "", unidade: "m²", checked: false },
    { tipo: "Rampa para Embarcação", valor: "", unidade: "m²", checked: false },
    { tipo: "Embarcações", valor: "", unidade: "und.", checked: false },
    { tipo: "Lavoura", valor: "", unidade: "m²", checked: false },
    { tipo: "Pastagem", valor: "", unidade: "m²", checked: false },
    { tipo: "Avanço de cerca", valor: "", unidade: "m", checked: false },
    { tipo: "Captação de água", valor: "", unidade: "m³", checked: false },
    { tipo: "Plantio de exóticas", valor: "", unidade: "indivíduos", checked: false },
    { tipo: "Área sem edificações", valor: "", unidade: "", checked: false },
    { tipo: "Área com vegetação nativa", valor: "", unidade: "", checked: false },
    { tipo: "Outros", valor: "", unidade: "", checked: false },
  ]);

  const [utmPoints, setUtmPoints] = useState<UTMPoint[]>([
    { id: "1", e: "", n: "" },
  ]);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mapImageUri, setMapImageUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [carInfo, setCarInfo] = useState<{
    carCode: string;
    areaHa?: number;
    city?: string;
    state?: string;
  } | null>(null);
  const [loadingCAR, setLoadingCAR] = useState(false);

  const polygonCoordinates = useMemo(() => {
    const zoneMatch = formData.zona_utm.match(/(\d+)([A-Za-z])/);
    if (!zoneMatch) return [];

    const zone = parseInt(zoneMatch[1], 10);
    const zoneLetter = zoneMatch[2].toUpperCase();
    const isNorth = zoneLetter >= "N";

    const coords: LatLng[] = [];
    for (const point of utmPoints) {
      const e = parseFloat(point.e);
      const n = parseFloat(point.n);
      if (!isNaN(e) && !isNaN(n) && e > 0 && n > 0) {
        try {
          const latLng = utmToLatLng(e, n, zone, isNorth);
          if (latLng.latitude >= -90 && latLng.latitude <= 90 && 
              latLng.longitude >= -180 && latLng.longitude <= 180) {
            coords.push(latLng);
          }
        } catch (err) {
          console.warn("Error converting UTM:", err);
        }
      }
    }
    return coords;
  }, [utmPoints, formData.zona_utm]);

  const mapRegion = useMemo(() => {
    if (polygonCoordinates.length === 0) {
      return {
        latitude: -23.5,
        longitude: -47.4,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      };
    }

    const lats = polygonCoordinates.map((c) => c.latitude);
    const lngs = polygonCoordinates.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = Math.max((maxLat - minLat) * 1.5, 0.005);
    const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.005);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [polygonCoordinates]);

  const handleMapImageCaptured = (uri: string) => {
    setMapImageUri(uri);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Sucesso", "Imagem do mapa capturada!");
  };

  const toggleUsoSolo = (index: number) => {
    Haptics.selectionAsync();
    setUsosSolo((prev) =>
      prev.map((uso, i) => (i === index ? { ...uso, checked: !uso.checked } : uso))
    );
  };

  const updateUsoSoloValor = (index: number, valor: string) => {
    setUsosSolo((prev) =>
      prev.map((uso, i) => (i === index ? { ...uso, valor } : uso))
    );
  };

  const createVistoria = useMutation({
    mutationFn: async (data: FormData) => {
      const coordenadasUtm = utmPoints
        .filter((p) => p.e && p.n)
        .map((p, idx) => ({ e: p.e, n: p.n, ordem: idx + 1 }));

      const fotosData = photos.map((p, idx) => ({
        uri: p.uri,
        legenda: p.legenda,
        ordem: idx + 1,
      }));

      const usosSoloData = usosSolo
        .filter((uso) => uso.checked)
        .map((uso) => ({
          tipo: uso.tipo,
          valor: uso.valor,
          unidade: uso.unidade,
        }));

      const response = await apiRequest("POST", "/api/vistorias", {
        ...data,
        usuario_id: user?.id,
        coordenadas_utm: coordenadasUtm,
        fotos: fotosData,
        usos_solo: usosSoloData,
        croqui_imagem: mapImageUri,
        assinatura_uri: signatureUri,
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

  const addUtmPoint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUtmPoints((prev) => [
      ...prev,
      { id: Date.now().toString(), e: "", n: "" },
    ]);
  };

  const fetchCARByCoordinates = async (latitude: number, longitude: number) => {
    setLoadingCAR(true);
    try {
      const response = await fetch(new URL("/api/mapbiomas/car-by-coordinates", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });
      const data = await response.json();
      
      if (data.success && data.carCodes && data.carCodes.length > 0) {
        const carCode = data.carCodes[0];
        setCarInfo({
          carCode,
          areaHa: data.property?.areaHa,
          city: data.property?.city,
          state: data.property?.state,
        });
        return carCode;
      }
      return null;
    } catch (error) {
      console.error("Error fetching CAR:", error);
      return null;
    } finally {
      setLoadingCAR(false);
    }
  };

  const captureGPSPoint = async () => {
    setCapturingGPS(true);
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert("Permissão Necessária", "Precisamos de acesso à localização para capturar coordenadas GPS.");
        return;
      }

      const utm = await captureCurrentUTM();
      if (utm) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        updateField("zona_utm", `${utm.zone}${utm.zoneLetter}`);
        setUtmPoints((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            e: utm.easting.toFixed(2),
            n: utm.northing.toFixed(2),
          },
        ]);

        const lat = utm.latitude;
        const lng = utm.longitude;
        
        if (lat && lng) {
          const carCode = await fetchCARByCoordinates(lat, lng);
          if (carCode) {
            Alert.alert(
              "Coordenada Capturada",
              `E: ${utm.easting.toFixed(2)}\nN: ${utm.northing.toFixed(2)}\n\nCódigo CAR encontrado:\n${carCode}`
            );
          } else {
            Alert.alert("Sucesso", `Coordenada capturada!\nE: ${utm.easting.toFixed(2)}\nN: ${utm.northing.toFixed(2)}\n\nNenhum CAR encontrado nesta localização.`);
          }
        } else {
          Alert.alert("Sucesso", `Coordenada capturada!\nE: ${utm.easting.toFixed(2)}\nN: ${utm.northing.toFixed(2)}`);
        }
      } else {
        Alert.alert("Erro", "Não foi possível obter a localização atual.");
      }
    } catch (error) {
      console.error("Error capturing GPS:", error);
      Alert.alert("Erro", "Erro ao capturar localização GPS.");
    } finally {
      setCapturingGPS(false);
    }
  };

  const removeUtmPoint = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUtmPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const updateUtmPoint = (id: string, field: "e" | "n", value: string) => {
    setUtmPoints((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão Necessária", "Precisamos de acesso à câmera para tirar fotos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhotos((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          uri: result.assets[0].uri,
          legenda: "",
        },
      ]);
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão Necessária", "Precisamos de acesso à galeria para selecionar fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled && result.assets.length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newPhotos = result.assets.map((asset) => ({
        id: Date.now().toString() + Math.random(),
        uri: asset.uri,
        legenda: "",
      }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePhotoLegenda = (id: string, legenda: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, legenda } : p))
    );
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
                  color: formData[field] === option ? "#FFFFFF" : theme.text,
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
            <Feather name="file-text" size={18} /> 01 – Identificação Propriedade
          </ThemedText>
          {renderInput("Localização", "localizacao", "Descrição da localização")}
          {renderInput("Município", "municipio", "Ex: Ibiúna")}
          {renderInput("UF", "uf", "Ex: SP")}
          {renderInput("Setor", "setor", "Ex: 13")}
          <DatePickerField
            label="Data"
            value={formData.data_vistoria}
            onChange={(date) => updateField("data_vistoria", date)}
          />
          {renderInput("Número da Notificação", "numero_notificacao", "Ex: RO-NOT-ITU-2025.12.16")}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="user" size={18} /> 02 – Identificação Proprietário
          </ThemedText>
          {renderInput("Proprietário / Caseiro *", "proprietario", "Nome do proprietário ou caseiro")}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="layers" size={18} /> 03 – Usos Encontrados
          </ThemedText>
          <ThemedText style={[styles.subLabel, { marginTop: 0 }]}>
            Marque os usos identificados e informe as quantidades
          </ThemedText>
          
          <View style={styles.usosSoloGrid}>
            {usosSolo.map((uso, index) => (
              <View key={uso.tipo} style={styles.usoSoloItem}>
                <Pressable
                  onPress={() => toggleUsoSolo(index)}
                  style={[
                    styles.usoSoloCheck,
                    {
                      backgroundColor: uso.checked ? Colors.light.primary : theme.backgroundDefault,
                      borderColor: uso.checked ? Colors.light.primary : theme.border,
                    },
                  ]}
                >
                  {uso.checked ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </Pressable>
                <View style={styles.usoSoloContent}>
                  <ThemedText style={styles.usoSoloLabel}>
                    {uso.tipo} {uso.unidade ? `(${uso.unidade})` : ""}
                  </ThemedText>
                  {uso.checked && uso.unidade ? (
                    <TextInput
                      style={[
                        styles.usoSoloInput,
                        {
                          backgroundColor: theme.backgroundDefault,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      placeholder="Quantidade"
                      placeholderTextColor={theme.tabIconDefault}
                      value={uso.valor}
                      onChangeText={(v) => updateUsoSoloValor(index, v)}
                      keyboardType="numeric"
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {renderInput("Observação (usos)", "observacoes_usos", "Observações sobre os usos encontrados...", { multiline: true })}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="map-pin" size={18} /> Coordenadas UTM (Polígono)
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Zona UTM</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Ex: 23K"
              placeholderTextColor={theme.tabIconDefault}
              value={formData.zona_utm}
              onChangeText={(value) => updateField("zona_utm", value)}
            />
          </View>

          <ThemedText style={styles.subLabel}>
            Pontos do Polígono ({utmPoints.length} ponto{utmPoints.length !== 1 ? "s" : ""})
          </ThemedText>

          {utmPoints.map((point, index) => (
            <View key={point.id} style={styles.utmPointRow}>
              <ThemedText style={styles.pointNumber}>{index + 1}</ThemedText>
              <View style={styles.coordInput}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="E (Leste)"
                  placeholderTextColor={theme.tabIconDefault}
                  value={point.e}
                  onChangeText={(value) => updateUtmPoint(point.id, "e", value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordInput}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundDefault,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="N (Norte)"
                  placeholderTextColor={theme.tabIconDefault}
                  value={point.n}
                  onChangeText={(value) => updateUtmPoint(point.id, "n", value)}
                  keyboardType="numeric"
                />
              </View>
              {utmPoints.length > 1 ? (
                <Pressable
                  onPress={() => removeUtmPoint(point.id)}
                  style={styles.removePointBtn}
                >
                  <Feather name="x" size={18} color="#FF4444" />
                </Pressable>
              ) : null}
            </View>
          ))}

          <View style={styles.utmButtons}>
            <Pressable
              onPress={captureGPSPoint}
              disabled={capturingGPS}
              style={[styles.gpsBtn, { backgroundColor: Colors.light.accent }]}
            >
              {capturingGPS ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="navigation" size={18} color="#FFFFFF" />
              )}
              <ThemedText style={styles.gpsBtnText}>
                {capturingGPS ? "Capturando..." : "Capturar GPS"}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={addUtmPoint}
              style={[styles.addPointBtn, { borderColor: Colors.light.primary }]}
            >
              <Feather name="plus" size={18} color={Colors.light.primary} />
              <ThemedText style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>
                Adicionar Manual
              </ThemedText>
            </Pressable>
          </View>

          {carInfo ? (
            <View style={[styles.carInfoCard, { backgroundColor: Colors.light.accent + "15", borderColor: Colors.light.accent }]}>
              <View style={styles.carInfoHeader}>
                <Feather name="map-pin" size={18} color={Colors.light.accent} />
                <ThemedText style={[styles.carInfoTitle, { color: Colors.light.accent }]}>
                  Código CAR Encontrado
                </ThemedText>
              </View>
              <ThemedText style={styles.carCode}>{carInfo.carCode}</ThemedText>
              {carInfo.city || carInfo.state ? (
                <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                  {carInfo.city}{carInfo.city && carInfo.state ? " - " : ""}{carInfo.state}
                </ThemedText>
              ) : null}
              {carInfo.areaHa ? (
                <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                  Área: {carInfo.areaHa.toFixed(2)} ha
                </ThemedText>
              ) : null}
            </View>
          ) : loadingCAR ? (
            <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={Colors.light.accent} />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.tabIconDefault }}>
                Buscando código CAR no MapBiomas...
              </ThemedText>
            </View>
          ) : null}

          {polygonCoordinates.length >= 3 ? (
            <View style={styles.mapSection}>
              <ThemedText style={styles.subLabel}>Visualização do Polígono</ThemedText>
              <MapPolygonView
                polygonCoordinates={polygonCoordinates}
                mapRegion={mapRegion}
                onMapImageCaptured={handleMapImageCaptured}
                mapImageUri={mapImageUri}
              />
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Feather name="map" size={40} color={theme.tabIconDefault} />
              <ThemedText style={{ color: theme.tabIconDefault, marginTop: Spacing.sm, textAlign: "center" }}>
                Adicione pelo menos 3 pontos para visualizar o polígono no mapa
              </ThemedText>
            </View>
          )}
        </View>

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="camera" size={18} /> Fotos da Vistoria
          </ThemedText>

          <View style={styles.photoButtons}>
            <Pressable
              onPress={pickImage}
              style={[styles.photoBtn, { backgroundColor: Colors.light.primary }]}
            >
              <Feather name="camera" size={20} color="#FFFFFF" />
              <ThemedText style={styles.photoBtnText}>Tirar Foto</ThemedText>
            </Pressable>

            <Pressable
              onPress={pickFromGallery}
              style={[styles.photoBtn, { backgroundColor: Colors.light.accent }]}
            >
              <Feather name="image" size={20} color="#FFFFFF" />
              <ThemedText style={styles.photoBtnText}>Da Galeria</ThemedText>
            </Pressable>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View
                  key={photo.id}
                  style={[
                    styles.photoCard,
                    { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                  ]}
                >
                  <View style={styles.photoHeader}>
                    <ThemedText style={styles.photoNumber}>Foto {index + 1}</ThemedText>
                    <Pressable onPress={() => removePhoto(photo.id)}>
                      <Feather name="trash-2" size={18} color="#FF4444" />
                    </Pressable>
                  </View>
                  <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                  <TextInput
                    style={[
                      styles.legendaInput,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    placeholder="Digite a legenda da foto..."
                    placeholderTextColor={theme.tabIconDefault}
                    value={photo.legenda}
                    onChangeText={(value) => updatePhotoLegenda(photo.id, value)}
                    multiline
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noPhotos}>
              <Feather name="image" size={40} color={theme.tabIconDefault} />
              <ThemedText style={{ color: theme.tabIconDefault, marginTop: Spacing.sm }}>
                Nenhuma foto adicionada
              </ThemedText>
            </View>
          )}
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

        <View
          style={[
            styles.section,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            <Feather name="edit-2" size={18} /> Assinatura
          </ThemedText>
          <SignatureCapture
            onSignatureCapture={setSignatureUri}
            signatureUri={signatureUri}
          />
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
  utmPointRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  pointNumber: {
    width: 24,
    textAlign: "center",
    fontWeight: "600",
    color: Colors.light.primary,
  },
  coordInput: {
    flex: 1,
  },
  removePointBtn: {
    padding: Spacing.sm,
  },
  utmButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  gpsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  gpsBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  addPointBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  mapSection: {
    marginTop: Spacing.lg,
  },
  mapPlaceholder: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
    marginTop: Spacing.lg,
  },
  photoButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  photoBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  photosGrid: {
    gap: Spacing.lg,
  },
  photoCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  photoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  photoNumber: {
    fontWeight: "600",
    color: Colors.light.primary,
  },
  photoThumbnail: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.md,
    resizeMode: "cover",
  },
  legendaInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    marginTop: Spacing.sm,
    minHeight: 60,
    textAlignVertical: "top",
  },
  noPhotos: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  usosSoloGrid: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  usoSoloItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  usoSoloCheck: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  usoSoloContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  usoSoloLabel: {
    fontSize: 14,
    minWidth: 150,
  },
  usoSoloInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 14,
    width: 100,
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
  carInfoCard: {
    flexDirection: "column",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  carInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  carInfoTitle: {
    fontWeight: "600",
    fontSize: 14,
  },
  carCode: {
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: Spacing.xs,
  },
  carDetails: {
    fontSize: 12,
  },
});
