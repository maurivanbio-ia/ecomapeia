import { getApiUrl } from "./queryClient";

const API_BASE = getApiUrl();

export interface PolygonData {
  type: "Polygon";
  coordinates: [number, number][][];
}

export interface NDVIAnalysis {
  success: boolean;
  source: string;
  analysisDate: string;
  polygon: {
    center: { lat: number; lng: number };
    bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number };
    areaHa: number;
    areaKm2: number;
  };
  ndvi: {
    value: number;
    health: string;
    description: string;
    scale: {
      min: number;
      max: number;
      legend: Array<{ range: string; label: string }>;
    };
  };
  landCover: {
    classes: Array<{ class: string; percentage: number }>;
    methodology: string;
  };
  recommendation: string;
}

export interface DETERAlert {
  id: string;
  date: string;
  areaHa: number;
  classeName: string;
  municipality: string;
  state: string;
  geometry: any;
  source: string;
}

export interface ANAStation {
  id: string;
  name: string;
  type: string;
  state: string;
  municipality: string;
  river: string;
  basin: string;
  latitude: number;
  longitude: number;
  status: string;
  source: string;
}

export interface IBGEMunicipality {
  id: number;
  name: string;
  microregion: string;
  mesoregion: string;
  state: string;
  stateName: string;
  region: string;
}

export interface SiBBrOccurrence {
  key: string;
  scientificName: string;
  vernacularName?: string;
  eventDate: string;
  year: number;
  latitude: number;
  longitude: number;
  stateProvince: string;
  municipality: string;
  family: string;
  iucnRedListCategory?: string;
  source: string;
}

export interface UnifiedAnalysis {
  success: boolean;
  analysisDate: string;
  source: string;
  bbox?: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  centerPoint?: { lat: number; lng: number };
  sections: {
    vegetation: {
      title: string;
      ndvi: number;
      health: string;
      coverage: string;
      recommendation: string;
    };
    deforestation: {
      title: string;
      recentAlerts: number;
      lastAlertDate: string;
      riskLevel: string;
    };
    hydrology: {
      title: string;
      nearbyStations: number;
      mainBasin: string;
      waterQuality: string;
      lastMeasurement: string;
    };
    biodiversity: {
      title: string;
      speciesRecorded: number;
      threatenedSpecies: number;
      endemicSpecies: number;
      mainTaxa: string[];
    };
    territorialInfo: {
      title: string;
      biome: string;
      microregion: string;
      mesoregion: string;
    };
  };
  summary: {
    overallStatus: string;
    mainConcerns: string[];
    recommendations: string[];
  };
}

export async function analyzeNDVI(polygon: PolygonData): Promise<NDVIAnalysis> {
  const response = await fetch(`${API_BASE}/api/environmental/satellite/ndvi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ polygon }),
  });

  if (!response.ok) {
    throw new Error("Erro ao analisar NDVI");
  }

  return response.json();
}

export async function getDETERAlerts(biome: string, startDate?: string, endDate?: string): Promise<{ alerts: DETERAlert[] }> {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const url = `${API_BASE}/api/environmental/inpe/deter/${biome}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar alertas DETER");
  }

  return response.json();
}

export async function getINPEFires(state?: string, startDate?: string, endDate?: string): Promise<{ fires: any[] }> {
  const params = new URLSearchParams();
  if (state) params.append("state", state);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const url = `${API_BASE}/api/environmental/inpe/fires?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar focos de queimadas");
  }

  return response.json();
}

export async function getANAStations(state?: string, type?: string): Promise<{ stations: ANAStation[] }> {
  const params = new URLSearchParams();
  if (state) params.append("state", state);
  if (type) params.append("type", type);

  const url = `${API_BASE}/api/environmental/ana/stations?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar estações ANA");
  }

  return response.json();
}

export async function getANAStationTelemetric(stationId: string, startDate: string, endDate: string): Promise<any> {
  const params = new URLSearchParams({ startDate, endDate });

  const url = `${API_BASE}/api/environmental/ana/telemetric/${stationId}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar dados telemétricos");
  }

  return response.json();
}

export async function getIBGEStates(): Promise<{ states: Array<{ id: number; acronym: string; name: string; region: string }> }> {
  const url = `${API_BASE}/api/environmental/ibge/states`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar estados IBGE");
  }

  return response.json();
}

export async function getIBGEMunicipalities(stateId: string): Promise<{ municipalities: IBGEMunicipality[] }> {
  const url = `${API_BASE}/api/environmental/ibge/municipalities/${stateId}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar municípios IBGE");
  }

  return response.json();
}

export async function getIBGEBiomes(): Promise<any> {
  const url = `${API_BASE}/api/environmental/ibge/biomes`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar biomas IBGE");
  }

  return response.json();
}

export async function getSiBBrSpecies(scientificName?: string, vernacularName?: string, limit = 50): Promise<{ species: any[] }> {
  const params = new URLSearchParams();
  if (scientificName) params.append("scientificName", scientificName);
  if (vernacularName) params.append("vernacularName", vernacularName);
  params.append("limit", limit.toString());

  const url = `${API_BASE}/api/environmental/sibbr/species?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar espécies SiBBr");
  }

  return response.json();
}

export async function getSiBBrOccurrences(
  scientificName?: string,
  stateProvince?: string,
  latitude?: number,
  longitude?: number,
  radius = 50,
  limit = 100
): Promise<{ occurrences: SiBBrOccurrence[] }> {
  const params = new URLSearchParams();
  if (scientificName) params.append("scientificName", scientificName);
  if (stateProvince) params.append("stateProvince", stateProvince);
  if (latitude && longitude) {
    params.append("decimalLatitude", latitude.toString());
    params.append("decimalLongitude", longitude.toString());
    params.append("radius", radius.toString());
  }
  params.append("limit", limit.toString());

  const url = `${API_BASE}/api/environmental/sibbr/occurrences?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar ocorrências SiBBr");
  }

  return response.json();
}

export async function getSiBBrThreatenedSpecies(stateProvince?: string, limit = 100): Promise<{ occurrences: SiBBrOccurrence[] }> {
  const params = new URLSearchParams();
  if (stateProvince) params.append("stateProvince", stateProvince);
  params.append("limit", limit.toString());

  const url = `${API_BASE}/api/environmental/sibbr/threatened-species?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar espécies ameaçadas");
  }

  return response.json();
}

export async function getUnifiedAnalysis(polygon: PolygonData, municipalityId?: number, stateAcronym?: string): Promise<UnifiedAnalysis> {
  const response = await fetch(`${API_BASE}/api/environmental/analyze-area`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ polygon, municipalityId, stateAcronym }),
  });

  if (!response.ok) {
    throw new Error("Erro ao realizar análise ambiental");
  }

  return response.json();
}

export async function getSatelliteImages(bbox: string, startDate?: string, endDate?: string, cloudCoverMax = 20): Promise<any> {
  const params = new URLSearchParams({ bbox, cloudCoverMax: cloudCoverMax.toString() });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);

  const url = `${API_BASE}/api/environmental/satellite/available-images?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Erro ao buscar imagens de satélite");
  }

  return response.json();
}

export function getNDVIColor(value: number): string {
  if (value >= 0.6) return "#1a7f37";
  if (value >= 0.4) return "#4caf50";
  if (value >= 0.2) return "#ffeb3b";
  if (value >= 0) return "#ff9800";
  return "#2196f3";
}

export function getRiskLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case "alto":
      return "#e53935";
    case "médio":
      return "#ff9800";
    case "baixo":
      return "#4caf50";
    default:
      return "#9e9e9e";
  }
}

export function getIUCNColor(category: string): string {
  switch (category?.toUpperCase()) {
    case "CR":
      return "#d62839";
    case "EN":
      return "#f26419";
    case "VU":
      return "#ffba08";
    case "NT":
      return "#6b8e23";
    case "LC":
      return "#2a9d8f";
    default:
      return "#9e9e9e";
  }
}

export function formatArea(areaHa: number): string {
  if (areaHa >= 1000) {
    return `${(areaHa / 100).toFixed(2)} km²`;
  }
  return `${areaHa.toFixed(2)} ha`;
}

export function formatCoordinate(value: number, type: "lat" | "lng"): string {
  const direction = type === "lat" 
    ? (value >= 0 ? "N" : "S")
    : (value >= 0 ? "E" : "W");
  return `${Math.abs(value).toFixed(6)}° ${direction}`;
}
