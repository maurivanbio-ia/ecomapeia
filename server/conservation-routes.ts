import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router = Router();

interface UCFeature {
  type: string;
  properties: {
    Name?: string;
    NOM_UC?: string;
    NOM_UC_A?: string;
    CATEG?: string;
    GESTAO?: string;
    INSTANC?: string;
    AREA_KM2?: string;
    AREA?: string;
    BIOMA?: string;
    SIGLA_UF?: string;
    MUN?: string;
    ANO?: number;
    RESTR?: string;
    RESTR_NM?: number;
    OBS?: string;
    ID?: number;
  };
  geometry: {
    type: string;
    coordinates: number[][][];
  };
}

interface UCData {
  type: string;
  name: string;
  features: UCFeature[];
}

let ucsData: UCData | null = null;

function loadUCsData(): UCData | null {
  if (ucsData) return ucsData;
  
  try {
    const filePath = path.join(__dirname, "data", "ucs_brasil.geojson");
    const fileContent = fs.readFileSync(filePath, "utf-8");
    ucsData = JSON.parse(fileContent);
    console.log(`Loaded ${ucsData?.features?.length || 0} conservation units`);
    return ucsData;
  } catch (error) {
    console.error("Error loading UCs data:", error);
    return null;
  }
}

loadUCsData();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getPolygonCentroid(coordinates: number[][][]): { lat: number; lon: number } {
  let totalLat = 0;
  let totalLon = 0;
  let count = 0;

  const ring = coordinates[0];
  if (!ring) return { lat: 0, lon: 0 };

  for (const coord of ring) {
    totalLon += coord[0];
    totalLat += coord[1];
    count++;
  }

  return {
    lat: totalLat / count,
    lon: totalLon / count,
  };
}

function isPointInPolygon(lat: number, lon: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function checkPointInUC(lat: number, lon: number, geometry: { type: string; coordinates: any }): boolean {
  if (geometry.type === "Polygon") {
    return isPointInPolygon(lat, lon, geometry.coordinates[0]);
  } else if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      if (isPointInPolygon(lat, lon, polygon[0])) {
        return true;
      }
    }
  }
  return false;
}

router.get("/ucs", async (req: Request, res: Response) => {
  try {
    const { state, category, biome, limit = 100 } = req.query;
    const data = loadUCsData();

    if (!data) {
      return res.status(500).json({ error: "Dados de UCs não disponíveis" });
    }

    let filtered = data.features;

    if (state) {
      filtered = filtered.filter(f => 
        f.properties.SIGLA_UF?.toLowerCase() === String(state).toLowerCase()
      );
    }

    if (category) {
      filtered = filtered.filter(f => 
        f.properties.CATEG?.toLowerCase() === String(category).toLowerCase()
      );
    }

    if (biome) {
      filtered = filtered.filter(f => 
        f.properties.BIOMA?.toLowerCase().includes(String(biome).toLowerCase())
      );
    }

    const ucs = filtered.slice(0, Number(limit)).map(f => ({
      id: f.properties.ID,
      name: f.properties.NOM_UC || f.properties.NOM_UC_A,
      category: f.properties.CATEG,
      categoryName: getCategoryFullName(f.properties.CATEG || ""),
      management: f.properties.GESTAO,
      instance: f.properties.INSTANC,
      areaKm2: parseFloat(f.properties.AREA_KM2 || f.properties.AREA || "0"),
      biome: f.properties.BIOMA,
      state: f.properties.SIGLA_UF,
      municipality: f.properties.MUN,
      year: f.properties.ANO,
      restriction: f.properties.RESTR,
      restrictionType: getRestrictionType(f.properties.RESTR || ""),
    }));

    res.json({
      success: true,
      source: "CNUC/ICMBio - Cadastro Nacional de Unidades de Conservação",
      total: ucs.length,
      ucs,
    });
  } catch (error) {
    console.error("Error fetching UCs:", error);
    res.status(500).json({
      error: "Erro ao consultar Unidades de Conservação",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/ucs/nearest", async (req: Request, res: Response) => {
  try {
    const { lat, lon, limit = 5 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
    }

    const latitude = parseFloat(String(lat));
    const longitude = parseFloat(String(lon));

    const data = loadUCsData();
    if (!data) {
      return res.status(500).json({ error: "Dados de UCs não disponíveis" });
    }

    const ucsWithDistance = data.features.map(f => {
      let centroid: { lat: number; lon: number };
      
      if (f.geometry.type === "Polygon") {
        centroid = getPolygonCentroid(f.geometry.coordinates as number[][][]);
      } else if (f.geometry.type === "MultiPolygon") {
        const firstPolygon = (f.geometry.coordinates as number[][][][])[0];
        centroid = getPolygonCentroid(firstPolygon);
      } else {
        centroid = { lat: 0, lon: 0 };
      }

      const distance = haversineDistance(latitude, longitude, centroid.lat, centroid.lon);
      const isInside = checkPointInUC(latitude, longitude, f.geometry);

      return {
        id: f.properties.ID,
        name: f.properties.NOM_UC || f.properties.NOM_UC_A,
        category: f.properties.CATEG,
        categoryName: getCategoryFullName(f.properties.CATEG || ""),
        management: f.properties.GESTAO,
        instance: f.properties.INSTANC,
        areaKm2: parseFloat(f.properties.AREA_KM2 || f.properties.AREA || "0"),
        biome: f.properties.BIOMA,
        state: f.properties.SIGLA_UF,
        municipality: f.properties.MUN,
        restriction: f.properties.RESTR,
        restrictionType: getRestrictionType(f.properties.RESTR || ""),
        centroid,
        distanceKm: Math.round(distance * 100) / 100,
        isInside,
      };
    });

    ucsWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    const nearest = ucsWithDistance.slice(0, Number(limit));
    const insideUC = ucsWithDistance.find(uc => uc.isInside);

    res.json({
      success: true,
      source: "CNUC/ICMBio",
      coordinates: { lat: latitude, lon: longitude },
      insideUC: insideUC || null,
      nearestUCs: nearest,
    });
  } catch (error) {
    console.error("Error finding nearest UC:", error);
    res.status(500).json({
      error: "Erro ao buscar UC mais próxima",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/ucs/categories", async (req: Request, res: Response) => {
  const categories = [
    { code: "PARNA", name: "Parque Nacional", type: "PROT_INT" },
    { code: "REBIO", name: "Reserva Biológica", type: "PROT_INT" },
    { code: "ESEC", name: "Estação Ecológica", type: "PROT_INT" },
    { code: "MONA", name: "Monumento Natural", type: "PROT_INT" },
    { code: "REVIS", name: "Refúgio de Vida Silvestre", type: "PROT_INT" },
    { code: "APA", name: "Área de Proteção Ambiental", type: "USO_SUST" },
    { code: "ARIE", name: "Área de Relevante Interesse Ecológico", type: "USO_SUST" },
    { code: "FLONA", name: "Floresta Nacional", type: "USO_SUST" },
    { code: "FLOES", name: "Floresta Estadual", type: "USO_SUST" },
    { code: "RESEX", name: "Reserva Extrativista", type: "USO_SUST" },
    { code: "RDS", name: "Reserva de Desenvolvimento Sustentável", type: "USO_SUST" },
    { code: "RPPN", name: "Reserva Particular do Patrimônio Natural", type: "USO_SUST" },
    { code: "PARES", name: "Parque Estadual", type: "PROT_INT" },
  ];

  res.json({
    success: true,
    categories,
  });
});

const FUNAI_API_BASE = "https://geoserver.funai.gov.br/geoserver";

router.get("/tis", async (req: Request, res: Response) => {
  try {
    const { state, situation, bbox, limit = 50 } = req.query;

    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeName: "funai:ti_brasil",
      outputFormat: "application/json",
      maxFeatures: String(limit),
    });

    let cqlFilter = "";
    if (state) {
      cqlFilter = `uf = '${state}'`;
    }
    if (situation) {
      const sitFilter = `fase_ti = '${situation}'`;
      cqlFilter = cqlFilter ? `${cqlFilter} AND ${sitFilter}` : sitFilter;
    }

    if (cqlFilter) {
      params.append("CQL_FILTER", cqlFilter);
    }
    if (bbox) {
      params.append("bbox", String(bbox));
    }

    const url = `${FUNAI_API_BASE}/funai/wfs?${params}`;
    
    try {
      const response = await fetch(url, { 
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();

        const tis = (data.features || []).map((f: any) => ({
          id: f.id,
          name: f.properties?.terrai_nom || f.properties?.nome,
          ethnicity: f.properties?.etnia_nome || f.properties?.etnias,
          situation: f.properties?.fase_ti || f.properties?.situacao,
          areaHa: f.properties?.terrai_are || f.properties?.area_ha,
          state: f.properties?.uf,
          municipality: f.properties?.municipio,
          population: f.properties?.populacao,
          geometry: f.geometry,
        }));

        return res.json({
          success: true,
          source: "FUNAI - Fundação Nacional dos Povos Indígenas",
          total: tis.length,
          tis,
        });
      }
    } catch (fetchError) {
      console.log("FUNAI API not available, using fallback data");
    }

    res.json({
      success: true,
      source: "FUNAI (dados offline)",
      message: "API FUNAI indisponível. Usando dados de referência.",
      total: 0,
      tis: [],
      note: "Para dados atualizados, acesse: https://www.gov.br/funai/pt-br",
    });
  } catch (error) {
    console.error("Error fetching TIs:", error);
    res.status(500).json({
      error: "Erro ao consultar Terras Indígenas",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/tis/nearest", async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius = 100 } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
    }

    const latitude = parseFloat(String(lat));
    const longitude = parseFloat(String(lon));
    const radiusKm = parseFloat(String(radius));

    const bbox = `${longitude - radiusKm/111},${latitude - radiusKm/111},${longitude + radiusKm/111},${latitude + radiusKm/111}`;

    const params = new URLSearchParams({
      service: "WFS",
      version: "2.0.0",
      request: "GetFeature",
      typeName: "funai:ti_brasil",
      outputFormat: "application/json",
      maxFeatures: "10",
      bbox: bbox,
    });

    const url = `${FUNAI_API_BASE}/funai/wfs?${params}`;

    try {
      const response = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();

        const tis = (data.features || []).map((f: any) => ({
          id: f.id,
          name: f.properties?.terrai_nom || f.properties?.nome,
          ethnicity: f.properties?.etnia_nome,
          situation: f.properties?.fase_ti,
          areaHa: f.properties?.terrai_are,
          state: f.properties?.uf,
        }));

        return res.json({
          success: true,
          source: "FUNAI",
          coordinates: { lat: latitude, lon: longitude },
          nearestTIs: tis,
        });
      }
    } catch (fetchError) {
      console.log("FUNAI nearest API not available");
    }

    res.json({
      success: true,
      source: "FUNAI (indisponível)",
      coordinates: { lat: latitude, lon: longitude },
      nearestTIs: [],
      message: "Serviço FUNAI temporariamente indisponível",
    });
  } catch (error) {
    console.error("Error finding nearest TI:", error);
    res.status(500).json({
      error: "Erro ao buscar TI mais próxima",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

router.get("/areas-embargadas", async (req: Request, res: Response) => {
  try {
    const { lat, lon, radius = 50 } = req.query;

    res.json({
      success: true,
      source: "IBAMA - Áreas Embargadas",
      message: "Consulte áreas embargadas em: https://servicos.ibama.gov.br/ctf/publico/areasembargadas/ConsultaPublicaAreasEmbargadas.php",
      coordinates: lat && lon ? { lat: parseFloat(String(lat)), lon: parseFloat(String(lon)) } : null,
      embargoedAreas: [],
      note: "API de embargos requer autenticação. Dados não disponíveis diretamente.",
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao consultar áreas embargadas",
    });
  }
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const data = loadUCsData();
    
    if (!data) {
      return res.status(500).json({ error: "Dados não disponíveis" });
    }

    const byCategory: Record<string, number> = {};
    const byBiome: Record<string, number> = {};
    const byState: Record<string, number> = {};
    const byInstance: Record<string, number> = {};
    let totalAreaKm2 = 0;

    for (const f of data.features) {
      const cat = f.properties.CATEG || "OUTROS";
      const biome = f.properties.BIOMA || "OUTROS";
      const state = f.properties.SIGLA_UF || "OUTROS";
      const instance = f.properties.INSTANC || "OUTROS";
      const area = parseFloat(f.properties.AREA_KM2 || f.properties.AREA || "0");

      byCategory[cat] = (byCategory[cat] || 0) + 1;
      byBiome[biome] = (byBiome[biome] || 0) + 1;
      byState[state] = (byState[state] || 0) + 1;
      byInstance[instance] = (byInstance[instance] || 0) + 1;
      totalAreaKm2 += area;
    }

    res.json({
      success: true,
      source: "CNUC/ICMBio",
      totalUCs: data.features.length,
      totalAreaKm2: Math.round(totalAreaKm2),
      totalAreaHa: Math.round(totalAreaKm2 * 100),
      byCategory,
      byBiome,
      byState,
      byInstance,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro ao gerar estatísticas",
    });
  }
});

function getCategoryFullName(code: string): string {
  const names: Record<string, string> = {
    PARNA: "Parque Nacional",
    REBIO: "Reserva Biológica",
    ESEC: "Estação Ecológica",
    MONA: "Monumento Natural",
    REVIS: "Refúgio de Vida Silvestre",
    APA: "Área de Proteção Ambiental",
    ARIE: "Área de Relevante Interesse Ecológico",
    FLONA: "Floresta Nacional",
    FLOES: "Floresta Estadual",
    RESEX: "Reserva Extrativista",
    RDS: "Reserva de Desenvolvimento Sustentável",
    RPPN: "Reserva Particular do Patrimônio Natural",
    PARES: "Parque Estadual",
  };
  return names[code] || code;
}

function getRestrictionType(code: string): string {
  const types: Record<string, string> = {
    PROT_INT: "Proteção Integral",
    USO_SUST: "Uso Sustentável",
  };
  return types[code] || code;
}

export default router;
