import { getApiUrl } from "@/lib/query-client";

const API_BASE = getApiUrl();

export interface MapBiomasAlert {
  alertCode: number;
  detectedAt: string;
  publishedAt: string;
  areaHa: number;
  source: string;
  biome: string;
  state: string;
  city: string;
  statusName: string;
  ruralPropertiesTotal: number;
  ruralPropertiesCodes: string[];
  legalReservesTotal: number;
  legalReservesArea: number;
  appTotal: number;
  conservationUnits?: string[];
  indigenousLands?: string[];
  settlements?: string[];
  quilombos?: string[];
  geometryWkt?: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export async function getAlertByCode(alertCode: number): Promise<MapBiomasAlert | null> {
  const response = await fetch(new URL(`/api/mapbiomas/alert/${alertCode}`, API_BASE).toString());

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao buscar alerta");
  }

  const data = await response.json();
  return data.alert;
}

export async function searchAlert(alertCode: number): Promise<MapBiomasAlert | null> {
  const response = await fetch(new URL("/api/mapbiomas/search", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alertCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao buscar alerta");
  }

  const data = await response.json();
  return data.alert;
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

export function getAlertSeverity(areaHa: number): "low" | "medium" | "high" | "critical" {
  if (areaHa < 1) return "low";
  if (areaHa < 10) return "medium";
  if (areaHa < 100) return "high";
  return "critical";
}

export function getAlertSeverityColor(severity: "low" | "medium" | "high" | "critical"): string {
  const colors = {
    low: "#4CAF50",
    medium: "#FFC107",
    high: "#FF9800",
    critical: "#F44336",
  };
  return colors[severity];
}
