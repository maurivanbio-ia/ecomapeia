import { getApiUrl } from "@/lib/query-client";

const API_BASE = getApiUrl();

export interface AlertCAR {
  id: number;
  code: string;
  area: number;
  intersectionArea: number;
  type: string;
}

export interface LegalReserve {
  id: number;
  areaHa: number;
  carCode: string;
  ruralPropertyId: string;
  stateAcronym: string;
  insertedAt?: string;
  updatedAt?: string;
  version?: number;
  ruralProperty?: RuralPropertyBasic;
}

export interface PermanentProtectedArea {
  id: number;
  areaHa: number;
  carCode: string;
  ruralPropertyId: string;
  stateAcronym: string;
  insertedAt?: string;
  updatedAt?: string;
  version?: number;
  ruralProperty?: RuralPropertyBasic;
}

export interface RuralPropertyBasic {
  id: number;
  code: string;
  areaHa: number;
  type: string;
}

export interface RuralProperty {
  id: number;
  code: string;
  areaHa: number;
  type: string;
  alertAreaInCar: number;
  alertGeometryCode?: string;
  alertInPropertyImage?: string;
  afterDeforestationSimplifiedImage?: string;
  layerImage?: string;
  propertyInStateImage?: string;
  insertedAt?: string;
  updatedAt?: string;
  version?: number;
  legalReserves?: LegalReserve[];
  permanentProtectedAreas?: PermanentProtectedArea[];
}

export interface AlertGeometryPoint {
  id: number;
  number: number;
  xCoord: string;
  yCoord: string;
  ruralPropertyId: number;
}

export interface ClassLabel {
  name: string;
  colors: string[];
  colorsWithLabels: Record<string, string>;
}

export interface MapBiomasAlert {
  alertCode: string;
  detectedAt: string;
  publishedAt: string;
  areaHa: number;
  source: string;
  biome: string;
  state: string;
  city: string;
  cars?: AlertCAR[];
  ruralProperties?: RuralProperty[];
}

export interface MapBiomasAlertDetail extends MapBiomasAlert {
  statusId: number;
  alertInsideCARAreaHa: number;
  geometry: any;
  images?: {
    before?: { url: string; satellite: string; date: string };
    after?: { url: string; satellite: string; date: string };
  };
  conservationUnits?: Array<{ name: string; category: string }>;
  indigenousLands?: Array<{ name: string; ethnicName: string }>;
  settlements?: Array<{ name: string }>;
  quilombolaAreas?: Array<{ name: string }>;
  alertGeometryPoints?: AlertGeometryPoint[];
}

export interface FullAnalysisSummary {
  totalAlerts: number;
  totalAlertAreaHa: number;
  totalRuralProperties: number;
  totalLegalReserveAreaHa: number;
  totalAPPAreaHa: number;
}

export interface FullAnalysisResult {
  summary: FullAnalysisSummary;
  alerts: MapBiomasAlert[];
  ruralProperties: RuralProperty[];
  alertsTotal: number;
  ruralPropertiesTotal: number;
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
    throw new Error(error.message || error.error || "Falha ao buscar alertas");
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

export async function getRuralProperties(
  coordinates?: Coordinate[],
  carCode?: string
): Promise<{ ruralProperties: RuralProperty[]; total: number } | { ruralProperty: RuralProperty | null }> {
  const response = await fetch(new URL("/api/mapbiomas/rural-properties", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates, carCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao buscar propriedades rurais");
  }

  return await response.json();
}

export async function getLegalReserves(
  coordinates?: Coordinate[],
  carCode?: string
): Promise<{ legalReserves: LegalReserve[]; total: number }> {
  const response = await fetch(new URL("/api/mapbiomas/legal-reserves", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates, carCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao buscar reservas legais");
  }

  const data = await response.json();
  return { legalReserves: data.legalReserves, total: data.total };
}

export async function getPermanentProtectedAreas(
  coordinates?: Coordinate[],
  carCode?: string
): Promise<{ permanentProtectedAreas: PermanentProtectedArea[]; total: number }> {
  const response = await fetch(new URL("/api/mapbiomas/permanent-protected-areas", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates, carCode }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao buscar APPs");
  }

  const data = await response.json();
  return { permanentProtectedAreas: data.permanentProtectedAreas, total: data.total };
}

export async function getFullAnalysis(coordinates: Coordinate[]): Promise<FullAnalysisResult> {
  const response = await fetch(new URL("/api/mapbiomas/full-analysis", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordinates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error || "Falha ao realizar análise completa");
  }

  return await response.json();
}

export async function getClassLabels(): Promise<ClassLabel[]> {
  const response = await fetch(new URL("/api/mapbiomas/class-labels", API_BASE).toString());

  if (!response.ok) {
    throw new Error("Falha ao buscar legendas de classes");
  }

  const data = await response.json();
  return data.classLabels;
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

export function getCARTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "IRU": "Imóvel Rural",
    "ASS": "Assentamento",
    "PCT": "Comunidade Tradicional",
    "TI": "Terra Indígena",
  };
  return labels[type] || type;
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
