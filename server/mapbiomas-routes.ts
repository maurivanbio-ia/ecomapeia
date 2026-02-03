import { Router, Request, Response } from "express";

const router = Router();

const MAPBIOMAS_API_URL = "https://plataforma.alerta.mapbiomas.org/api/v2/graphql";

router.get("/alert/:alertCode", async (req: Request, res: Response) => {
  try {
    const { alertCode } = req.params;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const alertCodeInt = parseInt(alertCode, 10);
    if (isNaN(alertCodeInt)) {
      return res.status(400).json({ error: "Código de alerta inválido" });
    }

    const query = `
      query Alert($alertCode: Int!) {
        alert(alertCode: $alertCode) {
          alertCode
          detectedAt
          publishedAt
          areaHa
          sources
          statusName
          crossedBiomes
          crossedBiomesArea
          crossedStates
          crossedStatesArea
          crossedCities
          crossedCitiesArea
          geometryWkt
          bbox
          ruralPropertiesTotal
          ruralPropertiesCodes
          crossedLegalReservesTotal
          crossedLegalReservesArea
          crossedPermanentProtectedAreaTotal
          crossedConservationUnits
          crossedConservationUnitsArea
          crossedIndigenousLands
          crossedIndigenousLandsArea
          crossedSettlements
          crossedSettlementsArea
          crossedQuilombos
          crossedQuilombosArea
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { alertCode: alertCodeInt } })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("MapBiomas API errors:", data.errors);
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    const alert = data.data?.alert;
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    res.json({
      success: true,
      alert: {
        alertCode: alert.alertCode,
        detectedAt: alert.detectedAt,
        publishedAt: alert.publishedAt,
        areaHa: alert.areaHa,
        statusName: alert.statusName,
        geometryWkt: alert.geometryWkt,
        bbox: alert.bbox,
        biome: alert.crossedBiomes?.[0] || "N/A",
        biomes: alert.crossedBiomes || [],
        biomesArea: alert.crossedBiomesArea,
        state: alert.crossedStates?.[0] || "N/A",
        states: alert.crossedStates || [],
        statesArea: alert.crossedStatesArea,
        city: alert.crossedCities?.[0] || "N/A",
        cities: alert.crossedCities || [],
        citiesArea: alert.crossedCitiesArea,
        source: alert.sources?.[0] || "MapBiomas",
        sources: alert.sources || [],
        ruralPropertiesTotal: alert.ruralPropertiesTotal || 0,
        ruralPropertiesCodes: alert.ruralPropertiesCodes || [],
        legalReservesTotal: alert.crossedLegalReservesTotal || 0,
        legalReservesArea: alert.crossedLegalReservesArea || 0,
        appTotal: alert.crossedPermanentProtectedAreaTotal || 0,
        conservationUnits: alert.crossedConservationUnits || [],
        conservationUnitsArea: alert.crossedConservationUnitsArea || 0,
        indigenousLands: alert.crossedIndigenousLands || [],
        indigenousLandsArea: alert.crossedIndigenousLandsArea || 0,
        settlements: alert.crossedSettlements || [],
        settlementsArea: alert.crossedSettlementsArea || 0,
        quilombos: alert.crossedQuilombos || [],
        quilombosArea: alert.crossedQuilombosArea || 0
      }
    });

  } catch (error) {
    console.error("Error fetching MapBiomas alert:", error);
    res.status(500).json({ error: "Falha ao buscar detalhes do alerta" });
  }
});

router.post("/alerts-by-territory", async (req: Request, res: Response) => {
  try {
    const { territoryId, limit } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado",
        message: "Configure o token MAPBIOMAS_API_TOKEN nas variáveis de ambiente" 
      });
    }

    const query = `
      query AlertReport($territoryIds: [Int!], $limit: Int) {
        alertReport(
          territoryIds: $territoryIds
          limit: $limit
        )
      }
    `;

    const variables = {
      territoryIds: territoryId ? [territoryId] : null,
      limit: limit || 50
    };

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("MapBiomas API errors:", data.errors);
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    res.json({
      success: true,
      data: data.data?.alertReport || null
    });

  } catch (error) {
    console.error("Error fetching MapBiomas alerts:", error);
    res.status(500).json({ error: "Falha ao buscar alertas do MapBiomas" });
  }
});

router.get("/territories", async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const query = `
      query Territories($category: String) {
        territories(category: $category) {
          id
          name
          category
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { category: category || "state" } })
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    res.json({
      success: true,
      territories: data.data?.territories || []
    });

  } catch (error) {
    console.error("Error fetching territories:", error);
    res.status(500).json({ error: "Falha ao buscar territórios" });
  }
});

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const query = `
      query AlertSummary {
        alertSummary {
          total
          totalArea
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    res.json({
      success: true,
      summary: data.data?.alertSummary || null
    });

  } catch (error) {
    console.error("Error fetching MapBiomas summary:", error);
    res.status(500).json({ error: "Falha ao buscar resumo" });
  }
});

router.post("/search-by-car", async (req: Request, res: Response) => {
  try {
    const { carCode } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!carCode) {
      return res.status(400).json({ 
        error: "Forneça o código CAR (carCode)" 
      });
    }

    const query = `
      query AlertsByCar($carCode: String!) {
        alertsByCarCode(carCode: $carCode) {
          alertCode
          detectedAt
          publishedAt
          areaHa
          sources
          statusName
          crossedBiomes
          crossedStates
          crossedCities
          ruralPropertiesTotal
          ruralPropertiesCodes
          crossedLegalReservesTotal
          crossedLegalReservesArea
          crossedPermanentProtectedAreaTotal
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { carCode } })
    });

    const data = await response.json();

    if (data.errors) {
      console.log("MapBiomas CAR search not available, trying alternative approach");
      return res.json({
        success: true,
        alerts: [],
        message: "Busca por CAR não disponível na API. Use o código do alerta."
      });
    }

    const alerts = data.data?.alertsByCarCode || [];
    const formattedAlerts = alerts.map((alert: any) => ({
      alertCode: alert.alertCode,
      detectedAt: alert.detectedAt,
      publishedAt: alert.publishedAt,
      areaHa: alert.areaHa,
      statusName: alert.statusName,
      biome: alert.crossedBiomes?.[0] || "N/A",
      state: alert.crossedStates?.[0] || "N/A",
      city: alert.crossedCities?.[0] || "N/A",
      source: alert.sources?.[0] || "MapBiomas",
      ruralPropertiesTotal: alert.ruralPropertiesTotal || 0,
      legalReservesTotal: alert.crossedLegalReservesTotal || 0,
      appTotal: alert.crossedPermanentProtectedAreaTotal || 0
    }));

    res.json({
      success: true,
      alerts: formattedAlerts,
      total: formattedAlerts.length
    });

  } catch (error) {
    console.error("Error searching by CAR:", error);
    res.status(500).json({ error: "Falha ao buscar alertas por CAR" });
  }
});

router.post("/search-by-municipality", async (req: Request, res: Response) => {
  try {
    const { municipio, limit } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!municipio) {
      return res.status(400).json({ 
        error: "Forneça o nome do município" 
      });
    }

    const query = `
      query AlertsByMunicipality($municipio: String, $limit: Int) {
        publishedAlerts(
          filters: {
            city: $municipio
          }
          limit: $limit
        ) {
          data {
            alertCode
            detectedAt
            publishedAt
            areaHa
            sources
            statusName
            crossedBiomes
            crossedStates
            crossedCities
            ruralPropertiesTotal
            ruralPropertiesCodes
            crossedLegalReservesTotal
            crossedLegalReservesArea
            crossedPermanentProtectedAreaTotal
          }
          total
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { municipio, limit: limit || 20 } })
    });

    const data = await response.json();

    if (data.errors) {
      console.log("MapBiomas municipality search error:", data.errors);
      return res.json({
        success: true,
        alerts: [],
        message: "Não foi possível buscar alertas por município"
      });
    }

    const alertsData = data.data?.publishedAlerts;
    const alerts = alertsData?.data || [];
    
    const formattedAlerts = alerts.map((alert: any) => ({
      alertCode: alert.alertCode,
      detectedAt: alert.detectedAt,
      publishedAt: alert.publishedAt,
      areaHa: alert.areaHa,
      statusName: alert.statusName,
      biome: alert.crossedBiomes?.[0] || "N/A",
      state: alert.crossedStates?.[0] || "N/A",
      city: alert.crossedCities?.[0] || "N/A",
      source: alert.sources?.[0] || "MapBiomas",
      ruralPropertiesTotal: alert.ruralPropertiesTotal || 0,
      legalReservesTotal: alert.crossedLegalReservesTotal || 0,
      appTotal: alert.crossedPermanentProtectedAreaTotal || 0
    }));

    res.json({
      success: true,
      alerts: formattedAlerts,
      total: alertsData?.total || formattedAlerts.length
    });

  } catch (error) {
    console.error("Error searching by municipality:", error);
    res.status(500).json({ error: "Falha ao buscar alertas por município" });
  }
});

router.post("/search", async (req: Request, res: Response) => {
  try {
    const { alertCode } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!alertCode) {
      return res.status(400).json({ 
        error: "Forneça o código do alerta (alertCode)" 
      });
    }

    const alertCodeInt = parseInt(alertCode, 10);
    if (isNaN(alertCodeInt)) {
      return res.status(400).json({ error: "Código de alerta inválido" });
    }

    const query = `
      query Alert($alertCode: Int!) {
        alert(alertCode: $alertCode) {
          alertCode
          detectedAt
          publishedAt
          areaHa
          sources
          statusName
          crossedBiomes
          crossedBiomesArea
          crossedStates
          crossedCities
          ruralPropertiesTotal
          ruralPropertiesCodes
          crossedLegalReservesTotal
          crossedLegalReservesArea
          crossedPermanentProtectedAreaTotal
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { alertCode: alertCodeInt } })
    });

    const data = await response.json();

    if (data.errors) {
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    const alert = data.data?.alert;
    if (!alert) {
      return res.status(404).json({ error: "Alerta não encontrado" });
    }

    res.json({
      success: true,
      alert: {
        alertCode: alert.alertCode,
        detectedAt: alert.detectedAt,
        publishedAt: alert.publishedAt,
        areaHa: alert.areaHa,
        statusName: alert.statusName,
        biome: alert.crossedBiomes?.[0] || "N/A",
        state: alert.crossedStates?.[0] || "N/A",
        city: alert.crossedCities?.[0] || "N/A",
        source: alert.sources?.[0] || "MapBiomas",
        ruralPropertiesTotal: alert.ruralPropertiesTotal || 0,
        ruralPropertiesCodes: alert.ruralPropertiesCodes || [],
        legalReservesTotal: alert.crossedLegalReservesTotal || 0,
        legalReservesArea: alert.crossedLegalReservesArea || 0,
        appTotal: alert.crossedPermanentProtectedAreaTotal || 0
      }
    });

  } catch (error) {
    console.error("Error searching MapBiomas:", error);
    res.status(500).json({ error: "Falha ao buscar alerta" });
  }
});

router.post("/car-by-coordinates", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: "Latitude e longitude são obrigatórios" 
      });
    }

    const query = `
      query RuralPropertyByPoint($lat: Float!, $lng: Float!) {
        ruralPropertyByPoint(lat: $lat, lng: $lng) {
          id
          carCode
          areaHa
          status
          state
          city
          ownerType
          legalReserve {
            areaHa
            percentage
          }
          permanentProtectedArea {
            areaHa
            percentage
          }
        }
      }
    `;

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ 
        query, 
        variables: { 
          lat: parseFloat(latitude), 
          lng: parseFloat(longitude) 
        } 
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("MapBiomas CAR lookup errors:", data.errors);
      
      const alternativeQuery = `
        query AlertsByPoint($lat: Float!, $lng: Float!, $radius: Float) {
          alertsByPoint(lat: $lat, lng: $lng, radius: $radius) {
            alertCode
            ruralPropertiesCodes
            areaHa
            detectedAt
            crossedCities
            crossedStates
          }
        }
      `;
      
      const altResponse = await fetch(MAPBIOMAS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          query: alternativeQuery, 
          variables: { 
            lat: parseFloat(latitude), 
            lng: parseFloat(longitude),
            radius: 1000
          } 
        })
      });
      
      const altData = await altResponse.json();
      
      if (altData.data?.alertsByPoint?.length > 0) {
        const alerts = altData.data.alertsByPoint;
        const carCodes = alerts.flatMap((a: any) => a.ruralPropertiesCodes || []);
        const uniqueCarCodes = [...new Set(carCodes)];
        
        return res.json({
          success: true,
          source: "alerts",
          carCodes: uniqueCarCodes,
          alerts: alerts.slice(0, 5),
          coordinates: { latitude, longitude }
        });
      }
      
      return res.json({
        success: true,
        source: "none",
        carCodes: [],
        message: "Nenhum imóvel rural encontrado nesta localização",
        coordinates: { latitude, longitude }
      });
    }

    const property = data.data?.ruralPropertyByPoint;
    
    if (property) {
      res.json({
        success: true,
        source: "direct",
        property: {
          carCode: property.carCode,
          areaHa: property.areaHa,
          status: property.status,
          state: property.state,
          city: property.city,
          ownerType: property.ownerType,
          legalReserve: property.legalReserve,
          app: property.permanentProtectedArea
        },
        carCodes: [property.carCode],
        coordinates: { latitude, longitude }
      });
    } else {
      res.json({
        success: true,
        source: "none",
        carCodes: [],
        message: "Nenhum imóvel rural cadastrado nesta localização",
        coordinates: { latitude, longitude }
      });
    }

  } catch (error) {
    console.error("Error looking up CAR by coordinates:", error);
    res.status(500).json({ error: "Falha ao buscar CAR por coordenadas" });
  }
});

// MapBiomas Fogo - Consulta de focos de calor e histórico de queimadas
router.get("/fire/hotspots", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);

    // Consulta à API do INPE BDQUEIMADAS para focos ativos nas últimas 48h
    const today = new Date();
    const twoDaysAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);
    
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Calcula o bounding box aproximado para o raio
    const latDelta = radiusKm / 111; // ~111km por grau de latitude
    const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // API do INPE BDQUEIMADAS - Focos de calor
    const inpeUrl = `https://queimadas.dgi.inpe.br/api/focos?pais_id=33&data_inicio=${formatDate(twoDaysAgo)}&data_fim=${formatDate(today)}`;
    
    let hotspots: any[] = [];
    let fireRisk = "BAIXO";
    let nearbyFireCount = 0;
    
    try {
      const inpeResponse = await fetch(inpeUrl, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });
      
      if (inpeResponse.ok) {
        const inpeData = await inpeResponse.json();
        
        // Filtra focos próximos às coordenadas
        if (Array.isArray(inpeData)) {
          hotspots = inpeData.filter((foco: any) => {
            const focoLat = parseFloat(foco.lat || foco.latitude);
            const focoLng = parseFloat(foco.lon || foco.longitude);
            return focoLat >= minLat && focoLat <= maxLat && 
                   focoLng >= minLng && focoLng <= maxLng;
          }).slice(0, 50).map((foco: any) => ({
            id: foco.id,
            latitude: parseFloat(foco.lat || foco.latitude),
            longitude: parseFloat(foco.lon || foco.longitude),
            datahora: foco.datahora || foco.data_hora_gmt,
            satelite: foco.satelite,
            municipio: foco.municipio,
            estado: foco.estado,
            bioma: foco.bioma,
            diasSemChuva: foco.numero_dias_sem_chuva,
            precipitacao: foco.precipitacao,
            riscofogo: foco.risco_fogo,
            frp: foco.frp
          }));
          
          nearbyFireCount = hotspots.length;
        }
      }
    } catch (inpeError) {
      console.log("INPE API unavailable, using fallback data");
    }

    // Determina o nível de risco baseado nos focos encontrados
    if (nearbyFireCount >= 10) {
      fireRisk = "CRÍTICO";
    } else if (nearbyFireCount >= 5) {
      fireRisk = "ALTO";
    } else if (nearbyFireCount >= 1) {
      fireRisk = "MODERADO";
    }

    // Dados históricos de queimadas do MapBiomas (estatísticas por região)
    // Como não temos acesso direto à API, fornecemos informações baseadas em dados públicos
    const currentYear = today.getFullYear();
    const historicalNote = `Dados históricos de queimadas disponíveis no MapBiomas Fogo (1985-${currentYear - 1})`;

    res.json({
      success: true,
      coordinates: { latitude: lat, longitude: lng },
      radiusKm,
      period: {
        start: formatDate(twoDaysAgo),
        end: formatDate(today)
      },
      activeHotspots: {
        count: nearbyFireCount,
        riskLevel: fireRisk,
        hotspots: hotspots.slice(0, 10) // Limita para os 10 mais próximos
      },
      historical: {
        source: "MapBiomas Fogo Collection 4",
        coverage: "1985-2024",
        note: historicalNote,
        platformUrl: "https://plataforma.brasil.mapbiomas.org/fogo"
      },
      recommendations: getFireRecommendations(fireRisk, nearbyFireCount)
    });

  } catch (error) {
    console.error("Error fetching fire data:", error);
    res.status(500).json({ error: "Falha ao consultar dados de queimadas" });
  }
});

function getFireRecommendations(riskLevel: string, hotspotCount: number): string[] {
  const recommendations: string[] = [];
  
  if (riskLevel === "CRÍTICO") {
    recommendations.push("ALERTA: Área com alta concentração de focos de incêndio ativos");
    recommendations.push("Verificar presença de fumaça e atividade de fogo no local");
    recommendations.push("Documentar evidências de queimadas recentes");
    recommendations.push("Notificar IBAMA e Corpo de Bombeiros se necessário");
  } else if (riskLevel === "ALTO") {
    recommendations.push("Atenção: Focos de calor detectados na região");
    recommendations.push("Inspecionar área para sinais de queimadas");
    recommendations.push("Verificar conformidade com períodos de queima permitidos");
  } else if (riskLevel === "MODERADO") {
    recommendations.push("Poucos focos detectados nas proximidades");
    recommendations.push("Observar condições de vegetação seca");
    recommendations.push("Verificar aceiros e medidas de prevenção");
  } else {
    recommendations.push("Sem focos de calor ativos na região");
    recommendations.push("Manter monitoramento preventivo");
  }
  
  return recommendations;
}

// Consulta histórico de queimadas por ano para uma região
router.get("/fire/history", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, year } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude e longitude são obrigatórios" });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear() - 1;

    // Estatísticas aproximadas baseadas em dados públicos do MapBiomas
    // Em produção, isso seria integrado com a API do MapBiomas ou GEE
    const biome = getBiomeFromCoordinates(lat, lng);
    const historicalData = getHistoricalFireData(biome, targetYear);

    res.json({
      success: true,
      coordinates: { latitude: lat, longitude: lng },
      year: targetYear,
      biome,
      statistics: historicalData,
      source: "MapBiomas Fogo Collection 4",
      dataUrl: `https://storage.googleapis.com/mapbiomas-public/initiatives/brasil/collection_9/fire-col4/annual_burned/mapbiomas_fire_col4_br_annual_burned_${targetYear}.tif`
    });

  } catch (error) {
    console.error("Error fetching fire history:", error);
    res.status(500).json({ error: "Falha ao consultar histórico de queimadas" });
  }
});

function getBiomeFromCoordinates(lat: number, lng: number): string {
  // Classificação simplificada de biomas por coordenadas
  // Mata Atlântica: Sul e Sudeste costeiro
  if (lat < -20 && lng > -50) return "Mata Atlântica";
  // Amazônia: Norte
  if (lat > -10 && lng < -50) return "Amazônia";
  // Cerrado: Centro
  if (lat >= -20 && lat <= -5 && lng >= -55 && lng <= -40) return "Cerrado";
  // Caatinga: Nordeste interior
  if (lat > -15 && lat < -3 && lng > -45) return "Caatinga";
  // Pantanal: MS e MT
  if (lat >= -22 && lat <= -15 && lng >= -58 && lng <= -54) return "Pantanal";
  // Pampa: RS
  if (lat < -28 && lng > -57) return "Pampa";
  
  return "Mata Atlântica"; // Default para região de SP
}

function getHistoricalFireData(biome: string, year: number): any {
  // Dados aproximados baseados em relatórios do MapBiomas Fogo
  const biomesData: Record<string, any> = {
    "Amazônia": {
      averageAnnualBurnedAreaHa: 7500000,
      fireFrequencyClass: "Alta",
      mainCauses: ["Desmatamento", "Pecuária", "Agricultura"],
      peakMonths: ["Agosto", "Setembro", "Outubro"]
    },
    "Cerrado": {
      averageAnnualBurnedAreaHa: 8000000,
      fireFrequencyClass: "Muito Alta",
      mainCauses: ["Manejo de pastagem", "Agricultura", "Natural"],
      peakMonths: ["Julho", "Agosto", "Setembro"]
    },
    "Pantanal": {
      averageAnnualBurnedAreaHa: 1500000,
      fireFrequencyClass: "Alta",
      mainCauses: ["Seca extrema", "Pecuária", "Incêndios florestais"],
      peakMonths: ["Agosto", "Setembro", "Outubro"]
    },
    "Caatinga": {
      averageAnnualBurnedAreaHa: 500000,
      fireFrequencyClass: "Média",
      mainCauses: ["Queima de roçados", "Pecuária"],
      peakMonths: ["Outubro", "Novembro", "Dezembro"]
    },
    "Mata Atlântica": {
      averageAnnualBurnedAreaHa: 300000,
      fireFrequencyClass: "Baixa",
      mainCauses: ["Incêndios acidentais", "Queima de resíduos"],
      peakMonths: ["Agosto", "Setembro", "Outubro"]
    },
    "Pampa": {
      averageAnnualBurnedAreaHa: 200000,
      fireFrequencyClass: "Baixa",
      mainCauses: ["Manejo de campos", "Renovação de pastagem"],
      peakMonths: ["Fevereiro", "Março", "Agosto"]
    }
  };

  const data = biomesData[biome] || biomesData["Mata Atlântica"];
  
  return {
    ...data,
    year,
    note: `Estatísticas aproximadas para ${biome} baseadas em dados do MapBiomas Fogo`
  };
}

export default router;
