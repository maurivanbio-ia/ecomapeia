import { getApiUrl } from "@/lib/query-client";

const API_BASE = getApiUrl();

export interface PhotoAnalysis {
  tipoVegetacao: string;
  irregularidades: string[];
  usoSolo: string;
  observacoes: string;
  classificacaoRisco: "baixo" | "medio" | "alto";
  recomendacoes: string[];
}

export interface ReportSummary {
  resumoExecutivo: string;
  conclusaoTecnica: string;
  recomendacoes: string[];
  parecerFinal: string;
  classificacaoArea: "regular" | "irregular" | "parcialmente_regular";
}

export interface CoordinateValidation {
  poligonoValido: boolean;
  areaCalculadaHa: number;
  zonaUTM: string;
  observacoes: string;
  alertas: string[];
  sugestoes: string[];
}

export interface FormSuggestions {
  usoSolo?: string;
  tipoVegetacao?: string;
  descricaoArea?: string;
  intervencoes?: string;
  observacoes?: string;
}

export async function analyzePhoto(
  imageBase64: string,
  context?: string
): Promise<PhotoAnalysis> {
  const response = await fetch(new URL("/api/ai/analyze-photo", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, context }),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze photo");
  }

  const data = await response.json();
  return data.analysis;
}

export async function suggestDescription(
  fieldName: string,
  currentValue: string,
  vistoriaContext: Record<string, unknown>
): Promise<string> {
  const response = await fetch(new URL("/api/ai/suggest-description", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fieldName, currentValue, vistoriaContext }),
  });

  if (!response.ok) {
    throw new Error("Failed to get suggestion");
  }

  const data = await response.json();
  return data.suggestion;
}

export async function generateReportSummary(
  vistoria: Record<string, unknown>,
  fotos?: unknown[],
  coordenadas?: unknown[]
): Promise<ReportSummary> {
  const response = await fetch(new URL("/api/ai/generate-report-summary", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vistoria, fotos, coordenadas }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate report summary");
  }

  const data = await response.json();
  return data.summary;
}

export async function transcribeAudio(
  audioBase64: string,
  format: string = "wav"
): Promise<string> {
  const response = await fetch(new URL("/api/ai/transcribe-audio", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, format }),
  });

  if (!response.ok) {
    throw new Error("Failed to transcribe audio");
  }

  const data = await response.json();
  return data.text;
}

export async function validateCoordinates(
  coordenadas: unknown[],
  municipio?: string,
  areaEsperada?: string
): Promise<CoordinateValidation> {
  const response = await fetch(new URL("/api/ai/validate-coordinates", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coordenadas, municipio, areaEsperada }),
  });

  if (!response.ok) {
    throw new Error("Failed to validate coordinates");
  }

  const data = await response.json();
  return data.validation;
}

export async function autoFillForm(
  photoAnalysis: PhotoAnalysis | null,
  existingData: Record<string, unknown>
): Promise<FormSuggestions> {
  const response = await fetch(new URL("/api/ai/auto-fill-form", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photoAnalysis, existingData }),
  });

  if (!response.ok) {
    throw new Error("Failed to auto-fill form");
  }

  const data = await response.json();
  return data.suggestions;
}

export async function* streamFieldAssistant(
  question: string,
  context?: Record<string, unknown>
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(new URL("/api/ai/field-assistant", API_BASE).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context }),
  });

  if (!response.ok) {
    throw new Error("Failed to get assistant response");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const data = JSON.parse(line.slice(6));
          if (data.content) {
            yield data.content;
          }
          if (data.done) {
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export function getRiskColor(risk: "baixo" | "medio" | "alto"): string {
  switch (risk) {
    case "baixo":
      return "#22C55E";
    case "medio":
      return "#F59E0B";
    case "alto":
      return "#EF4444";
    default:
      return "#6B7280";
  }
}

export function getAreaStatusColor(status: "regular" | "irregular" | "parcialmente_regular"): string {
  switch (status) {
    case "regular":
      return "#22C55E";
    case "irregular":
      return "#EF4444";
    case "parcialmente_regular":
      return "#F59E0B";
    default:
      return "#6B7280";
  }
}
