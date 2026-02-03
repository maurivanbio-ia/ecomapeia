import { getApiUrl } from "@/lib/query-client";

const API_BASE = getApiUrl();

export interface MapBiomasAlert {
  alertCode: string;
  detectedAt: string;
  publishedAt: string;
  areaHa: number;
  source: string;
  biome: string;
  state: string;
  city: string;
}

export interface MapBiomasAlertDetail extends MapBiomasAlert {
  statusId: number;
  alertInsideCARAreaHa: number;
  geometry: any;
  images?: {
    before?: { url: string; satellite: string; date: string };
    after?: { url: string; satellite: string; date: string };
  };
  ruralProperties?: Array<{
    propertyCode: string;
    status: string;
    type: string;
    areaHa: number;
  }>;
  conservationUnits?: Array<{ name: string; category: string }>;
  indigenousLands?: Array<{ name: string; ethnicName: string }>;
  settlements?: Array<{ name: string }>;
  quilombolaAreas?: Array<{ name: string }>;
}

export interface LandCoverClass {
  classId: number;
  className: string;
  areaHa: number;
  percentage: number;
}

export interface LandCoverData {
  year: number;
  classes: LandCoverClass[];
  totalAreaHa: number;
  message?: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export async function getAlertsByLocation(
  coordinates: Coordinate[],
  startDate?: string,
  endDate?: string
): Promise<{ alerts: MapBiomasAlert[]; total: number }> {
  const response = await fetch(new URL("/api/mapbiomas/alerts-by-location", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates, startDate, endDate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Falha ao buscar alertas");
  }

  const data = await response.json();
  return { alerts: data.alerts, total: data.total };
}

export async function getAlertDetails(alertCode: string): Promise<MapBiomasAlertDetail | null> {
  const response = await fetch(new URL(`/api/mapbiomas/alert/${alertCode}`, API_BASE).toString());

  if (!response.ok) {
    throw new Error("Falha ao buscar detalhes do alerta");
  }

  const data = await response.json();
  return data.alert;
}

export async function getLandCover(
  coordinates: Coordinate[],
  year?: number
): Promise<LandCoverData | null> {
  const response = await fetch(new URL("/api/mapbiomas/land-cover", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates, year }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Falha ao buscar dados de uso do solo");
  }

  const data = await response.json();
  return data.landCover;
}

export function getBiomeColor(biome: string): string {
  const colors: Record<string, string> = {
    "Amazônia": "#2E7D32",
    "Cerrado": "#F9A825",
    "Mata Atlântica": "#1565C0",
    "Caatinga": "#8D6E63",
    "Pampa": "#7CB342",
    "Pantanal": "#00838F",
  };
  return colors[biome] || "#757575";
}

export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    "DETER": "DETER (INPE)",
    "SAD": "SAD (Imazon)",
    "GLAD": "GLAD (UMD)",
    "MAPBIOMAS": "MapBiomas",
  };
  return labels[source] || source;
}

export function getLandCoverColor(classId: number): string {
  const colors: Record<number, string> = {
    3: "#1F8D49",   // Formação Florestal
    4: "#7DC975",   // Formação Savânica
    5: "#04381D",   // Mangue
    9: "#7A5900",   // Silvicultura
    11: "#519799",  // Campo Alagado
    12: "#D6BC74",  // Formação Campestre
    15: "#EDDE8E",  // Pastagem
    18: "#E974ED",  // Agricultura
    21: "#FFEFC3",  // Mosaico Agricultura/Pastagem
    22: "#D4271E",  // Área não Vegetada
    23: "#FFD966",  // Praia/Duna/Areal
    24: "#D082DE",  // Infraestrutura Urbana
    25: "#6B0088",  // Outra Área não Vegetada
    29: "#AF2A2A",  // Afloramento Rochoso
    30: "#968C46",  // Mineração
    31: "#0000FF",  // Aquicultura
    33: "#0000FF",  // Corpos d'Água
    36: "#C71585",  // Lavoura Perene
    39: "#935132",  // Soja
    40: "#C27BA0",  // Arroz
    41: "#FFAA5F",  // Outras Lavouras Temporárias
    46: "#FF6D4C",  // Café
    47: "#D8BFD8",  // Citrus
    48: "#9C7A3D",  // Outras Lavouras Perenes
  };
  return colors[classId] || "#CCCCCC";
}

export function formatArea(areaHa: number): string {
  if (areaHa >= 1000) {
    return `${(areaHa / 1000).toFixed(2)} km²`;
  }
  return `${areaHa.toFixed(2)} ha`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}
