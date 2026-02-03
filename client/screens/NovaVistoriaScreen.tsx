import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { VistoriasStackParamList } from "@/navigation/VistoriasStackNavigator";

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
import { PhotoWatermarkProcessor, getCurrentLocation, createWatermarkData, WatermarkData } from "@/lib/photoWatermark";
import { useGPSTracking, TrackPoint } from "@/hooks/useGPSTracking";

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
  hora_vistoria: string;
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

interface WeatherData {
  temperatura: number;
  umidade: number;
  condicoes: string;
  velocidadeVento: number;
  direcaoVento: string;
  nebulosidade: number;
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
  saved: boolean;
  timestamp?: string;
  coordinates?: string;
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
  const navigation = useNavigation<NativeStackNavigationProp<VistoriasStackParamList>>();
  const queryClient = useQueryClient();

  const {
    isTracking,
    trackPoints,
    currentLocation,
    startTracking,
    stopTracking,
    clearTrack,
    totalDistance,
    elapsedTime,
    error: trackingError,
  } = useGPSTracking();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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
    hora_vistoria: currentTime,
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
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

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
  const [pendingWatermark, setPendingWatermark] = useState<{
    id: string;
    uri: string;
    watermarkData: WatermarkData;
  } | null>(null);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [mapImageUri, setMapImageUri] = useState<string | null>(null);
  const [signatureUri, setSignatureUri] = useState<string | null>(null);
  const [capturingGPS, setCapturingGPS] = useState(false);
  const [carInfo, setCarInfo] = useState<{
    carCode: string;
    areaHa?: number;
    city?: string;
    state?: string;
    status?: string;
  } | null>(null);
  const [loadingCAR, setLoadingCAR] = useState(false);
  const [ucInfo, setUcInfo] = useState<{
    name: string;
    category: string;
    categoryName: string;
    distanceKm: number;
    isInside: boolean;
    state?: string;
    biome?: string;
    restrictionType?: string;
    areaKm2?: number;
  } | null>(null);
  const [loadingUC, setLoadingUC] = useState(false);
  
  const [embargoCheck, setEmbargoCheck] = useState<{
    level: string;
    hasEmbargoRisk: boolean;
    isInsideProtectedArea: boolean;
    protectedAreaName?: string;
    protectionLevel?: string;
    reasons: string[];
    recommendations: string[];
  } | null>(null);
  const [loadingEmbargo, setLoadingEmbargo] = useState(false);
  
  const [complianceAnalysis, setComplianceAnalysis] = useState<{
    conformidadeGeral: string;
    pontuacao: number;
    riscos: Array<{ tipo: string; nivel: string; descricao: string; fundamentacaoLegal?: string }>;
    naoConformidades: Array<{ item: string; descricao: string; acaoCorretiva: string; prazoSugerido?: string }>;
    pontosFavoraveis: string[];
    recomendacoes: string[];
    resumoExecutivo: string;
  } | null>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  const [savedTracks, setSavedTracks] = useState<Array<{
    id: string;
    legenda: string;
    points: typeof trackPoints;
    distance: number;
    duration: number;
    color: string;
  }>>([]);
  const [showTrackLegendModal, setShowTrackLegendModal] = useState(false);
  const [trackLegendInput, setTrackLegendInput] = useState("");

  const trackColors = ["#FF6B00", "#4CAF50", "#2196F3", "#9C27B0", "#FF5722", "#00BCD4", "#E91E63", "#795548"];

  const saveCurrentTrack = () => {
    if (trackPoints.length === 0) return;
    
    const newTrack = {
      id: Date.now().toString(),
      legenda: trackLegendInput.trim() || `Trajeto ${savedTracks.length + 1}`,
      points: [...trackPoints],
      distance: totalDistance,
      duration: elapsedTime,
      color: trackColors[savedTracks.length % trackColors.length],
    };
    
    setSavedTracks(prev => [...prev, newTrack]);
    clearTrack();
    setTrackLegendInput("");
    setShowTrackLegendModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const removeTrack = (trackId: string) => {
    setSavedTracks(prev => prev.filter(t => t.id !== trackId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

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
        car_info: carInfo ? {
          codigo: carInfo.carCode,
          municipio: carInfo.city,
          area_total: carInfo.areaHa,
          situacao: carInfo.status,
        } : null,
        embargo_check: embargoCheck ? {
          level: embargoCheck.level,
          hasEmbargoRisk: embargoCheck.hasEmbargoRisk,
          isInsideProtectedArea: embargoCheck.isInsideProtectedArea,
          protectedAreaName: embargoCheck.protectedAreaName,
          protectionLevel: embargoCheck.protectionLevel,
          reasons: embargoCheck.reasons,
          recommendations: embargoCheck.recommendations,
        } : null,
        compliance_analysis: complianceAnalysis ? {
          conformidadeGeral: complianceAnalysis.conformidadeGeral,
          pontuacao: complianceAnalysis.pontuacao,
          riscos: complianceAnalysis.riscos,
          recomendacoes: complianceAnalysis.recomendacoes,
          resumoExecutivo: complianceAnalysis.resumoExecutivo,
        } : null,
        weather_data: weatherData ? {
          temperatura: weatherData.temperatura,
          umidade: weatherData.umidade,
          condicoes: weatherData.condicoes,
          velocidade_vento: weatherData.velocidadeVento,
          direcao_vento: weatherData.direcaoVento,
          nebulosidade: weatherData.nebulosidade,
        } : null,
        track_points: (() => {
          const allTracks = savedTracks.map(track => ({
            legenda: track.legenda,
            color: track.color,
            distance: track.distance,
            duration: track.duration,
            points: track.points.map(p => ({
              lat: p.latitude,
              lon: p.longitude,
              alt: p.altitude,
              acc: p.accuracy,
              ts: p.timestamp,
            })),
          }));
          
          if (trackPoints.length > 0) {
            allTracks.push({
              legenda: `Trajeto ${savedTracks.length + 1}`,
              color: trackColors[savedTracks.length % trackColors.length],
              distance: totalDistance,
              duration: elapsedTime,
              points: trackPoints.map(p => ({
                lat: p.latitude,
                lon: p.longitude,
                alt: p.altitude,
                acc: p.accuracy,
                ts: p.timestamp,
              })),
            });
          }
          
          return allTracks.length > 0 ? allTracks : null;
        })(),
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

  const fetchUCByCoordinates = async (latitude: number, longitude: number) => {
    setLoadingUC(true);
    try {
      const response = await fetch(
        new URL(`/api/conservation/ucs/nearest?lat=${latitude}&lon=${longitude}&limit=1`, getApiUrl()).toString()
      );
      const data = await response.json();
      
      if (data.success && data.nearestUCs && data.nearestUCs.length > 0) {
        const nearest = data.nearestUCs[0];
        setUcInfo({
          name: nearest.name,
          category: nearest.category,
          categoryName: nearest.categoryName,
          distanceKm: nearest.distanceKm,
          isInside: nearest.isInside || false,
          state: nearest.state,
          biome: nearest.biome,
          restrictionType: nearest.restrictionType,
          areaKm2: nearest.areaKm2,
        });
        return nearest;
      }
      return null;
    } catch (error) {
      console.error("Error fetching UC:", error);
      return null;
    } finally {
      setLoadingUC(false);
    }
  };

  const checkEmbargoByCoordinates = async (latitude: number, longitude: number, carCode?: string) => {
    setLoadingEmbargo(true);
    try {
      const response = await fetch(
        new URL("/api/conservation/check-embargo", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lon: longitude, carCode }),
        }
      );
      const data = await response.json();
      
      if (data.success) {
        setEmbargoCheck({
          level: data.embargoRisk?.level || "LOW",
          hasEmbargoRisk: data.embargoRisk?.hasEmbargoRisk || false,
          isInsideProtectedArea: data.isInsideProtectedArea || false,
          protectedAreaName: data.protectedAreaName,
          protectionLevel: data.protectionLevel,
          reasons: data.embargoRisk?.reasons || [],
          recommendations: data.recommendations || [],
        });
        return data;
      }
      return null;
    } catch (error) {
      console.error("Error checking embargo:", error);
      return null;
    } finally {
      setLoadingEmbargo(false);
    }
  };

  const runComplianceAnalysis = async (coordinates: { lat: number; lon: number }) => {
    setLoadingCompliance(true);
    try {
      const response = await fetch(
        new URL("/api/ai/compliance-analysis", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coordinates,
            ucInfo,
            carInfo,
            embargoCheck,
            propertyType: formData.tipo_inspecao,
            landUse: formData.tipo_intervencao,
            observations: formData.observacoes,
          }),
        }
      );
      const data = await response.json();
      
      if (data.success && data.analysis) {
        setComplianceAnalysis(data.analysis);
        return data.analysis;
      }
      return null;
    } catch (error) {
      console.error("Error running compliance analysis:", error);
      return null;
    } finally {
      setLoadingCompliance(false);
    }
  };

  const fetchWeatherByCoordinates = async (lat: number, lng: number) => {
    setLoadingWeather(true);
    try {
      const response = await fetch(
        new URL(`/api/features/weather?latitude=${lat}&longitude=${lng}`, getApiUrl()).toString()
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.weather) {
          const w = data.weather;
          const windDirections = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
          const windIndex = Math.round((w.windSpeed % 360) / 45) % 8;
          setWeatherData({
            temperatura: w.temperature,
            umidade: w.humidity,
            condicoes: w.description,
            velocidadeVento: w.windSpeed,
            direcaoVento: windDirections[windIndex] || "N",
            nebulosidade: w.cloudCover,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
    } finally {
      setLoadingWeather(false);
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
        
        const isFirstCapture = utmPoints.length === 1 && utmPoints[0].e === "" && utmPoints[0].n === "";
        
        if (isFirstCapture) {
          const captureTime = new Date();
          updateField("hora_vistoria", captureTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
          
          setUtmPoints([{
            id: "1",
            e: utm.easting.toFixed(2),
            n: utm.northing.toFixed(2),
          }]);

          const lat = utm.latitude;
          const lng = utm.longitude;
          
          if (lat && lng) {
            fetchCARByCoordinates(lat, lng);
            fetchUCByCoordinates(lat, lng);
            checkEmbargoByCoordinates(lat, lng, carInfo?.carCode);
            fetchWeatherByCoordinates(lat, lng);
            Alert.alert(
              "Primeira Coordenada Capturada",
              `E: ${utm.easting.toFixed(2)}\nN: ${utm.northing.toFixed(2)}\n\nAnalisando dados ambientais e clima...`
            );
          }
        } else {
          setUtmPoints((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              e: utm.easting.toFixed(2),
              n: utm.northing.toFixed(2),
            },
          ]);
          Alert.alert(
            `Coordenada ${utmPoints.length + 1} Capturada`,
            `E: ${utm.easting.toFixed(2)}\nN: ${utm.northing.toFixed(2)}`
          );
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

  // Track if environmental checks were already triggered for manual entry
  const [manualChecksTriggered, setManualChecksTriggered] = useState(false);

  // Check and trigger environmental verification when manual coordinates are entered
  const checkManualCoordinates = () => {
    // Only check if not already triggered and we have at least one point
    if (manualChecksTriggered || utmPoints.length === 0) return;

    const firstPoint = utmPoints[0];
    const e = parseFloat(firstPoint.e);
    const n = parseFloat(firstPoint.n);
    const zonaUtm = formData.zona_utm || "";

    // Validate that we have valid UTM coordinates
    if (isNaN(e) || isNaN(n) || e === 0 || n === 0) return;
    if (!zonaUtm || zonaUtm.length < 2) return;

    // Parse zone number and letter
    const zoneMatch = zonaUtm.match(/^(\d+)([A-Z])?$/i);
    if (!zoneMatch) return;

    const zone = parseInt(zoneMatch[1], 10);
    const zoneLetter = (zoneMatch[2] || "S").toUpperCase();
    const isNorth = zoneLetter >= "N";

    // Validate UTM ranges
    if (zone < 1 || zone > 60) return;
    if (e < 100000 || e > 900000) return;
    if (n < 0 || n > 10000000) return;

    try {
      const latLng = utmToLatLng(e, n, zone, isNorth);
      
      if (latLng.latitude && latLng.longitude) {
        setManualChecksTriggered(true);
        
        // Trigger all environmental checks
        fetchCARByCoordinates(latLng.latitude, latLng.longitude);
        fetchUCByCoordinates(latLng.latitude, latLng.longitude);
        checkEmbargoByCoordinates(latLng.latitude, latLng.longitude, carInfo?.carCode);
        fetchWeatherByCoordinates(latLng.latitude, latLng.longitude);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "Coordenadas Válidas",
          `Analisando dados ambientais para:\nE: ${e.toFixed(2)}\nN: ${n.toFixed(2)}\n\nBuscando CAR, Unidades de Conservação e verificando embargos...`
        );
      }
    } catch (error) {
      console.error("Error converting UTM to LatLng:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão Necessária", "Precisamos de acesso à câmera para tirar fotos.");
      return;
    }

    const location = await getCurrentLocation();

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const photoId = Date.now().toString();
      const watermarkData = createWatermarkData(location);
      
      setProcessingPhoto(true);
      setPendingWatermark({
        id: photoId,
        uri: result.assets[0].uri,
        watermarkData,
      });
    }
  };

  const handleWatermarkProcessed = (id: string, newUri: string) => {
    const watermarkData = pendingWatermark?.watermarkData;
    setPhotos((prev) => [
      ...prev,
      {
        id,
        uri: newUri,
        legenda: "",
        saved: false,
        timestamp: watermarkData?.timestamp,
        coordinates: watermarkData?.coordinates,
      },
    ]);
    setPendingWatermark(null);
    setProcessingPhoto(false);
  };

  const handleWatermarkError = (id: string) => {
    if (pendingWatermark) {
      setPhotos((prev) => [
        ...prev,
        {
          id,
          uri: pendingWatermark.uri,
          legenda: "",
          saved: false,
          timestamp: pendingWatermark.watermarkData?.timestamp,
          coordinates: pendingWatermark.watermarkData?.coordinates,
        },
      ]);
    }
    setPendingWatermark(null);
    setProcessingPhoto(false);
  };

  const savePhoto = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saved: true } : p))
    );
  };

  const editPhoto = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, saved: false } : p))
    );
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
        saved: false,
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
      <PhotoWatermarkProcessor
        pendingPhoto={pendingWatermark}
        onProcessed={handleWatermarkProcessed}
        onError={handleWatermarkError}
      />
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
          <View style={styles.dateTimeRow}>
            <View style={{ flex: 1 }}>
              <DatePickerField
                label="Data"
                value={formData.data_vistoria}
                onChange={(date) => updateField("data_vistoria", date)}
              />
            </View>
            <View style={styles.timeField}>
              <ThemedText style={styles.inputLabel}>Horário</ThemedText>
              <View style={[styles.timeDisplay, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="clock" size={18} color={Colors.light.accent} />
                <ThemedText style={styles.timeText}>{formData.hora_vistoria}</ThemedText>
              </View>
            </View>
          </View>
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
              onBlur={checkManualCoordinates}
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
                  onBlur={() => index === 0 && checkManualCoordinates()}
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
                  onBlur={() => index === 0 && checkManualCoordinates()}
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

          <View style={[styles.trackingSection, { backgroundColor: isTracking ? Colors.light.error + "10" : Colors.light.success + "10", borderColor: isTracking ? Colors.light.error : Colors.light.success }]}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingTitleRow}>
                <Feather name="activity" size={20} color={isTracking ? Colors.light.error : Colors.light.success} />
                <ThemedText style={[styles.trackingTitle, { color: isTracking ? Colors.light.error : Colors.light.success }]}>
                  Rastreamento de Trajeto
                </ThemedText>
                {isTracking ? (
                  <View style={[styles.trackingBadge, { backgroundColor: Colors.light.error }]}>
                    <View style={styles.trackingDot} />
                    <ThemedText style={styles.trackingBadgeText}>GRAVANDO</ThemedText>
                  </View>
                ) : null}
              </View>
            </View>

            {trackingError ? (
              <ThemedText style={[styles.trackingError, { color: Colors.light.error }]}>
                {trackingError}
              </ThemedText>
            ) : null}

            {isTracking ? (
              <View style={styles.trackingStats}>
                <View style={styles.trackingStat}>
                  <ThemedText style={styles.trackingStatLabel}>Tempo</ThemedText>
                  <ThemedText style={styles.trackingStatValue}>
                    {Math.floor(elapsedTime / 60).toString().padStart(2, "0")}:{(elapsedTime % 60).toString().padStart(2, "0")}
                  </ThemedText>
                </View>
                <View style={styles.trackingStat}>
                  <ThemedText style={styles.trackingStatLabel}>Distância</ThemedText>
                  <ThemedText style={styles.trackingStatValue}>
                    {totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(2)} km` : `${totalDistance.toFixed(0)} m`}
                  </ThemedText>
                </View>
                <View style={styles.trackingStat}>
                  <ThemedText style={styles.trackingStatLabel}>Pontos</ThemedText>
                  <ThemedText style={styles.trackingStatValue}>{trackPoints.length}</ThemedText>
                </View>
              </View>
            ) : trackPoints.length > 0 ? (
              <View style={styles.trackingStats}>
                <View style={styles.trackingStat}>
                  <ThemedText style={styles.trackingStatLabel}>Trajeto gravado</ThemedText>
                  <ThemedText style={styles.trackingStatValue}>
                    {totalDistance >= 1000 ? `${(totalDistance / 1000).toFixed(2)} km` : `${totalDistance.toFixed(0)} m`} • {trackPoints.length} pontos
                  </ThemedText>
                </View>
              </View>
            ) : (
              <ThemedText style={[styles.trackingInfo, { color: theme.tabIconDefault }]}>
                Grave o trajeto percorrido durante a vistoria para incluir no mapa e exportar em KMZ.
              </ThemedText>
            )}

            <View style={styles.trackingButtons}>
              {isTracking ? (
                <Pressable
                  onPress={stopTracking}
                  style={[styles.trackingBtn, { backgroundColor: Colors.light.error }]}
                >
                  <Feather name="square" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.trackingBtnText}>Parar Gravação</ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={startTracking}
                  style={[styles.trackingBtn, { backgroundColor: Colors.light.success }]}
                >
                  <Feather name="play" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.trackingBtnText}>
                    {trackPoints.length > 0 ? "Continuar Gravação" : "Iniciar Gravação"}
                  </ThemedText>
                </Pressable>
              )}
              {trackPoints.length > 0 && !isTracking ? (
                <>
                  <Pressable
                    onPress={() => setShowTrackLegendModal(true)}
                    style={[styles.trackingBtnOutline, { borderColor: Colors.light.accent }]}
                  >
                    <Feather name="save" size={18} color={Colors.light.accent} />
                    <ThemedText style={[styles.trackingBtnTextOutline, { color: Colors.light.accent }]}>Salvar</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Limpar Trajeto",
                        "Deseja apagar o trajeto atual sem salvar?",
                        [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Apagar", style: "destructive", onPress: clearTrack },
                        ]
                      );
                    }}
                    style={[styles.trackingBtnOutline, { borderColor: Colors.light.error }]}
                  >
                    <Feather name="trash-2" size={18} color={Colors.light.error} />
                    <ThemedText style={[styles.trackingBtnTextOutline, { color: Colors.light.error }]}>Limpar</ThemedText>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>

          {savedTracks.length > 0 ? (
            <View style={[styles.savedTracksContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText style={[styles.sectionSubtitle, { color: theme.text, marginBottom: Spacing.sm }]}>
                Trajetos Salvos ({savedTracks.length})
              </ThemedText>
              {savedTracks.map((track, index) => (
                <View 
                  key={track.id} 
                  style={[styles.savedTrackItem, { borderLeftColor: track.color }]}
                >
                  <View style={styles.savedTrackInfo}>
                    <View style={[styles.trackColorDot, { backgroundColor: track.color }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.savedTrackLabel, { color: theme.text }]}>
                        {track.legenda}
                      </ThemedText>
                      <ThemedText style={[styles.savedTrackStats, { color: theme.tabIconDefault }]}>
                        {track.points.length} pontos • {track.distance >= 1000 
                          ? `${(track.distance / 1000).toFixed(2)} km` 
                          : `${Math.round(track.distance)} m`} • {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, "0")}
                      </ThemedText>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        "Remover Trajeto",
                        `Deseja remover "${track.legenda}"?`,
                        [
                          { text: "Cancelar", style: "cancel" },
                          { text: "Remover", style: "destructive", onPress: () => removeTrack(track.id) },
                        ]
                      );
                    }}
                  >
                    <Feather name="x-circle" size={20} color={Colors.light.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

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

          {ucInfo ? (
            <View style={[styles.carInfoCard, { 
              backgroundColor: ucInfo.isInside ? Colors.light.warning + "20" : Colors.light.success + "15", 
              borderColor: ucInfo.isInside ? Colors.light.warning : Colors.light.success 
            }]}>
              <View style={styles.carInfoHeader}>
                <Feather name="shield" size={18} color={ucInfo.isInside ? Colors.light.warning : Colors.light.success} />
                <ThemedText style={[styles.carInfoTitle, { color: ucInfo.isInside ? Colors.light.warning : Colors.light.success }]}>
                  {ucInfo.isInside ? "Dentro de Unidade de Conservação" : "UC Mais Próxima"}
                </ThemedText>
              </View>
              <ThemedText style={styles.carCode}>{ucInfo.name}</ThemedText>
              <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                {ucInfo.categoryName} ({ucInfo.category})
              </ThemedText>
              <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                Distância: {ucInfo.distanceKm.toFixed(1)} km
              </ThemedText>
              {ucInfo.restrictionType ? (
                <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                  Tipo: {ucInfo.restrictionType}
                </ThemedText>
              ) : null}
              {ucInfo.biome ? (
                <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                  Bioma: {ucInfo.biome}
                </ThemedText>
              ) : null}
            </View>
          ) : loadingUC ? (
            <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={Colors.light.success} />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.tabIconDefault }}>
                Buscando Unidade de Conservação mais próxima...
              </ThemedText>
            </View>
          ) : null}

          {embargoCheck ? (
            <View style={[styles.carInfoCard, { 
              backgroundColor: embargoCheck.level === "HIGH" ? "#e5393520" : 
                              embargoCheck.level === "MEDIUM" ? Colors.light.warning + "20" : 
                              Colors.light.success + "15", 
              borderColor: embargoCheck.level === "HIGH" ? "#e53935" : 
                          embargoCheck.level === "MEDIUM" ? Colors.light.warning : 
                          Colors.light.success
            }]}>
              <View style={styles.carInfoHeader}>
                <Feather 
                  name={embargoCheck.level === "HIGH" ? "alert-octagon" : embargoCheck.level === "MEDIUM" ? "alert-triangle" : "check-circle"} 
                  size={18} 
                  color={embargoCheck.level === "HIGH" ? "#e53935" : embargoCheck.level === "MEDIUM" ? Colors.light.warning : Colors.light.success} 
                />
                <ThemedText style={[styles.carInfoTitle, { 
                  color: embargoCheck.level === "HIGH" ? "#e53935" : 
                        embargoCheck.level === "MEDIUM" ? Colors.light.warning : 
                        Colors.light.success 
                }]}>
                  {embargoCheck.level === "HIGH" ? "Risco de Embargo: ALTO" : 
                   embargoCheck.level === "MEDIUM" ? "Risco de Embargo: MÉDIO" : 
                   "Sem Risco de Embargo"}
                </ThemedText>
              </View>
              {embargoCheck.reasons.length > 0 ? (
                embargoCheck.reasons.map((reason, idx) => (
                  <ThemedText key={idx} style={[styles.carDetails, { color: theme.tabIconDefault }]}>
                    • {reason}
                  </ThemedText>
                ))
              ) : null}
              {embargoCheck.recommendations.length > 0 ? (
                <View style={{ marginTop: Spacing.xs }}>
                  <ThemedText style={[styles.carDetails, { color: theme.primary, fontWeight: "600" }]}>
                    Recomendações:
                  </ThemedText>
                  {embargoCheck.recommendations.slice(0, 2).map((rec, idx) => (
                    <ThemedText key={idx} style={[styles.carDetails, { color: theme.tabIconDefault, fontSize: 12 }]}>
                      • {rec}
                    </ThemedText>
                  ))}
                </View>
              ) : null}
            </View>
          ) : loadingEmbargo ? (
            <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={Colors.light.warning} />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.tabIconDefault }}>
                Verificando sobreposição com áreas protegidas...
              </ThemedText>
            </View>
          ) : null}

          {weatherData ? (
            <View style={[styles.carInfoCard, { backgroundColor: "#e3f2fd", borderColor: "#2196f3" }]}>
              <View style={styles.carInfoHeader}>
                <Feather name="cloud" size={18} color="#2196f3" />
                <ThemedText style={[styles.carInfoTitle, { color: "#2196f3" }]}>
                  Condições Climáticas
                </ThemedText>
              </View>
              <View style={styles.weatherGrid}>
                <View style={styles.weatherItem}>
                  <Feather name="thermometer" size={16} color="#e53935" />
                  <ThemedText style={styles.weatherValue}>{weatherData.temperatura.toFixed(1)}°C</ThemedText>
                  <ThemedText style={[styles.weatherLabel, { color: theme.tabIconDefault }]}>Temperatura</ThemedText>
                </View>
                <View style={styles.weatherItem}>
                  <Feather name="droplet" size={16} color="#2196f3" />
                  <ThemedText style={styles.weatherValue}>{weatherData.umidade}%</ThemedText>
                  <ThemedText style={[styles.weatherLabel, { color: theme.tabIconDefault }]}>Umidade</ThemedText>
                </View>
                <View style={styles.weatherItem}>
                  <Feather name="wind" size={16} color="#607d8b" />
                  <ThemedText style={styles.weatherValue}>{weatherData.velocidadeVento.toFixed(1)} km/h</ThemedText>
                  <ThemedText style={[styles.weatherLabel, { color: theme.tabIconDefault }]}>Vento</ThemedText>
                </View>
                <View style={styles.weatherItem}>
                  <Feather name="sun" size={16} color="#ff9800" />
                  <ThemedText style={styles.weatherValue}>{weatherData.nebulosidade}%</ThemedText>
                  <ThemedText style={[styles.weatherLabel, { color: theme.tabIconDefault }]}>Nebulosidade</ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.carDetails, { color: theme.tabIconDefault, marginTop: Spacing.xs }]}>
                Condição: {weatherData.condicoes} | Direção do vento: {weatherData.direcaoVento}
              </ThemedText>
            </View>
          ) : loadingWeather ? (
            <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color="#2196f3" />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.tabIconDefault }}>
                Buscando informações climáticas...
              </ThemedText>
            </View>
          ) : null}

          {polygonCoordinates.length > 0 ? (
            <TouchableOpacity
              style={[styles.mapBiomasButton, { backgroundColor: "#4caf50" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                const coords = polygonCoordinates[0];
                navigation.navigate("MapBiomas", {
                  latitude: coords?.latitude,
                  longitude: coords?.longitude,
                });
              }}
            >
              <Feather name="globe" size={18} color="#fff" />
              <ThemedText style={styles.complianceButtonText}>
                Consultar Alertas MapBiomas
              </ThemedText>
            </TouchableOpacity>
          ) : null}

          {embargoCheck && polygonCoordinates.length > 0 && !loadingCompliance ? (
            <TouchableOpacity
              style={[styles.complianceButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                if (polygonCoordinates.length > 0) {
                  runComplianceAnalysis({ lat: polygonCoordinates[0].latitude, lon: polygonCoordinates[0].longitude });
                  setShowComplianceModal(true);
                }
              }}
            >
              <Feather name="file-text" size={18} color="#fff" />
              <ThemedText style={styles.complianceButtonText}>
                Análise de Conformidade Ambiental
              </ThemedText>
            </TouchableOpacity>
          ) : loadingCompliance ? (
            <View style={[styles.carInfoCard, { backgroundColor: theme.backgroundSecondary }]}>
              <ActivityIndicator size="small" color={theme.primary} />
              <ThemedText style={{ marginLeft: Spacing.sm, color: theme.tabIconDefault }}>
                Executando análise de conformidade com IA...
              </ThemedText>
            </View>
          ) : null}

          {polygonCoordinates.length >= 3 ? (
            <View style={styles.mapSection}>
              <ThemedText style={styles.subLabel}>
                Visualização do Polígono {trackPoints.length > 0 ? `e Trajeto (${trackPoints.length} pontos)` : ""}
              </ThemedText>
              <MapPolygonView
                polygonCoordinates={polygonCoordinates}
                trackPoints={trackPoints.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
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
              disabled={processingPhoto}
              style={[
                styles.photoBtn, 
                { backgroundColor: processingPhoto ? theme.border : Colors.light.primary }
              ]}
            >
              {processingPhoto ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <ThemedText style={styles.photoBtnText}>Processando...</ThemedText>
                </>
              ) : (
                <>
                  <Feather name="camera" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.photoBtnText}>Tirar Foto</ThemedText>
                </>
              )}
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
                photo.saved ? (
                  <View
                    key={photo.id}
                    style={[
                      styles.photoCardCompact,
                      { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                    ]}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoThumbnailCompact} />
                    <View style={styles.photoCompactInfo}>
                      <ThemedText style={styles.photoNumberCompact}>Foto {index + 1}</ThemedText>
                      <ThemedText style={styles.photoLegendaCompact} numberOfLines={1}>
                        {photo.legenda || "Sem legenda"}
                      </ThemedText>
                    </View>
                    <View style={styles.photoCompactActions}>
                      <Pressable onPress={() => editPhoto(photo.id)} style={styles.compactActionBtn}>
                        <Feather name="edit-2" size={16} color={Colors.light.accent} />
                      </Pressable>
                      <Pressable onPress={() => removePhoto(photo.id)} style={styles.compactActionBtn}>
                        <Feather name="trash-2" size={16} color="#FF4444" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
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
                    <View style={styles.photoThumbnailWrapper}>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
                      {photo.timestamp ? (
                        <>
                          <View style={styles.watermarkBrand}>
                            <ThemedText style={styles.watermarkEco}>Eco</ThemedText>
                            <ThemedText style={styles.watermarkMape}>Mape</ThemedText>
                            <ThemedText style={styles.watermarkIA}>IA</ThemedText>
                          </View>
                          <View style={styles.watermarkInfo}>
                            <ThemedText style={styles.watermarkTimestamp}>{photo.timestamp}</ThemedText>
                            <ThemedText style={styles.watermarkCoords}>{photo.coordinates}</ThemedText>
                          </View>
                        </>
                      ) : null}
                    </View>
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
                    <Pressable
                      onPress={() => savePhoto(photo.id)}
                      style={[styles.savePhotoBtn, { backgroundColor: Colors.light.primary }]}
                    >
                      <Feather name="check" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.savePhotoBtnText}>Salvar Foto</ThemedText>
                    </Pressable>
                  </View>
                )
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

      <Modal
        visible={showComplianceModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowComplianceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Análise de Conformidade</ThemedText>
              <TouchableOpacity onPress={() => setShowComplianceModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {loadingCompliance ? (
              <View style={{ alignItems: "center", padding: Spacing.xl }}>
                <ActivityIndicator size="large" color={theme.primary} />
                <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
                  Analisando conformidade ambiental...
                </ThemedText>
              </View>
            ) : complianceAnalysis ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.complianceScore, { 
                  backgroundColor: complianceAnalysis.conformidadeGeral === "CONFORME" ? Colors.light.success + "20" :
                                   complianceAnalysis.conformidadeGeral === "PARCIALMENTE_CONFORME" ? Colors.light.warning + "20" :
                                   "#e5393520"
                }]}>
                  <ThemedText style={[styles.scoreValue, { 
                    color: complianceAnalysis.conformidadeGeral === "CONFORME" ? Colors.light.success :
                           complianceAnalysis.conformidadeGeral === "PARCIALMENTE_CONFORME" ? Colors.light.warning :
                           "#e53935"
                  }]}>
                    {complianceAnalysis.pontuacao || 0}%
                  </ThemedText>
                  <ThemedText style={[styles.scoreLabel, { 
                    color: complianceAnalysis.conformidadeGeral === "CONFORME" ? Colors.light.success :
                           complianceAnalysis.conformidadeGeral === "PARCIALMENTE_CONFORME" ? Colors.light.warning :
                           "#e53935"
                  }]}>
                    {complianceAnalysis.conformidadeGeral === "CONFORME" ? "CONFORME" :
                     complianceAnalysis.conformidadeGeral === "PARCIALMENTE_CONFORME" ? "PARCIALMENTE CONFORME" :
                     "NÃO CONFORME"}
                  </ThemedText>
                </View>

                {complianceAnalysis.resumoExecutivo ? (
                  <View style={styles.complianceSection}>
                    <ThemedText style={[styles.complianceSectionTitle, { color: theme.primary }]}>
                      Resumo Executivo
                    </ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, fontSize: 13, lineHeight: 20 }}>
                      {complianceAnalysis.resumoExecutivo}
                    </ThemedText>
                  </View>
                ) : null}

                {complianceAnalysis.riscos && complianceAnalysis.riscos.length > 0 ? (
                  <View style={styles.complianceSection}>
                    <ThemedText style={[styles.complianceSectionTitle, { color: "#e53935" }]}>
                      Riscos Identificados
                    </ThemedText>
                    {complianceAnalysis.riscos.map((risco, idx) => (
                      <View key={idx} style={[styles.riskItem, { 
                        backgroundColor: risco.nivel === "CRITICO" || risco.nivel === "ALTO" ? "#e5393515" : 
                                        risco.nivel === "MEDIO" ? Colors.light.warning + "15" : 
                                        Colors.light.success + "15"
                      }]}>
                        <ThemedText style={[styles.riskItemTitle, { 
                          color: risco.nivel === "CRITICO" || risco.nivel === "ALTO" ? "#e53935" : 
                                risco.nivel === "MEDIO" ? Colors.light.warning : 
                                Colors.light.success
                        }]}>
                          [{risco.nivel}] {risco.tipo}
                        </ThemedText>
                        <ThemedText style={[styles.riskItemDesc, { color: theme.textSecondary }]}>
                          {risco.descricao}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {complianceAnalysis.recomendacoes && complianceAnalysis.recomendacoes.length > 0 ? (
                  <View style={styles.complianceSection}>
                    <ThemedText style={[styles.complianceSectionTitle, { color: theme.primary }]}>
                      Recomendações
                    </ThemedText>
                    {complianceAnalysis.recomendacoes.map((rec, idx) => (
                      <ThemedText key={idx} style={{ color: theme.textSecondary, fontSize: 12, marginBottom: 4 }}>
                        • {rec}
                      </ThemedText>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            ) : (
              <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
                Nenhuma análise disponível
              </ThemedText>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTrackLegendModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTrackLegendModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary, maxWidth: 400 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>
                Salvar Trajeto
              </ThemedText>
              <TouchableOpacity onPress={() => setShowTrackLegendModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={[styles.label, { color: theme.text, marginTop: Spacing.md }]}>
              Legenda do Trajeto
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
              value={trackLegendInput}
              onChangeText={setTrackLegendInput}
              placeholder={`Ex: Área de APP, Desmatamento, Limite norte...`}
              placeholderTextColor={theme.tabIconDefault}
              autoFocus
            />

            <View style={{ marginTop: Spacing.md }}>
              <ThemedText style={[styles.savedTrackStats, { color: theme.tabIconDefault }]}>
                {trackPoints.length} pontos • {totalDistance >= 1000 
                  ? `${(totalDistance / 1000).toFixed(2)} km` 
                  : `${Math.round(totalDistance)} m`} • {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, "0")}
              </ThemedText>
            </View>

            <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.lg }}>
              <Pressable
                onPress={() => setShowTrackLegendModal(false)}
                style={[styles.trackingBtnOutline, { flex: 1, borderColor: theme.border }]}
              >
                <ThemedText style={[styles.trackingBtnTextOutline, { color: theme.text }]}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                onPress={saveCurrentTrack}
                style={[styles.trackingBtn, { flex: 1, backgroundColor: Colors.light.accent }]}
              >
                <Feather name="check" size={18} color="#FFFFFF" />
                <ThemedText style={styles.trackingBtnText}>Salvar</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  photoThumbnailWrapper: {
    position: "relative",
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  photoThumbnail: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.md,
    resizeMode: "cover",
  },
  watermarkBrand: {
    position: "absolute",
    top: 8,
    left: 8,
    flexDirection: "row",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkEco: {
    color: "#4ADE80",
    fontSize: 12,
    fontWeight: "800",
  },
  watermarkMape: {
    color: "#60A5FA",
    fontSize: 12,
    fontWeight: "800",
  },
  watermarkIA: {
    color: "#FBBF24",
    fontSize: 12,
    fontWeight: "800",
  },
  watermarkInfo: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  watermarkTimestamp: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "right",
  },
  watermarkCoords: {
    color: "#FFFFFF",
    fontSize: 9,
    textAlign: "right",
    marginTop: 1,
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
  savePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  savePhotoBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  photoCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  photoThumbnailCompact: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    resizeMode: "cover",
  },
  photoCompactInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  photoNumberCompact: {
    fontWeight: "600",
    fontSize: 13,
    color: Colors.light.primary,
  },
  photoLegendaCompact: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  photoCompactActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  compactActionBtn: {
    padding: Spacing.xs,
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
  complianceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  mapBiomasButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  complianceButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  complianceScore: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: "700",
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: Spacing.xs,
  },
  complianceSection: {
    marginBottom: Spacing.md,
  },
  complianceSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  riskItem: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
  },
  riskItemTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  riskItemDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  dateTimeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timeField: {
    width: 100,
  },
  timeDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  weatherGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  weatherItem: {
    flex: 1,
    minWidth: 70,
    alignItems: "center",
    padding: Spacing.sm,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: BorderRadius.sm,
  },
  weatherValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
  weatherLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  trackingSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  trackingHeader: {
    marginBottom: Spacing.sm,
  },
  trackingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  trackingBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  trackingError: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  trackingInfo: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  trackingStats: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  trackingStat: {
    flex: 1,
    minWidth: 80,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  trackingStatLabel: {
    fontSize: 11,
    opacity: 0.7,
  },
  trackingStatValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  trackingButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  trackingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  trackingBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  trackingBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  trackingBtnTextOutline: {
    fontSize: 14,
    fontWeight: "600",
  },
  savedTracksContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  savedTrackItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    borderLeftWidth: 4,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  savedTrackInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  trackColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  savedTrackLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  savedTrackStats: {
    fontSize: 12,
  },
});
