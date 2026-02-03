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

export default router;
