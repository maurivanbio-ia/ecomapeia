import { Router, Request, Response } from "express";

const router = Router();

const MAPBIOMAS_API_URL = "https://plataforma.alerta.mapbiomas.org/api/v2/graphql";

interface MapBiomasAlertResponse {
  data?: {
    alerts?: Array<{
      alertCode: string;
      detectedAt: string;
      publishedAt: string;
      areaHa: number;
      source: string;
      biome: string;
      state: string;
      city: string;
      geometry: any;
    }>;
    publishedAlerts?: {
      data: Array<{
        alertCode: string;
        detectedAt: string;
        publishedAt: string;
        areaHa: number;
        source: string;
        biome: string;
        state: string;
        city: string;
      }>;
      total: number;
    };
  };
  errors?: Array<{ message: string }>;
}

router.post("/alerts-by-location", async (req: Request, res: Response) => {
  try {
    const { coordinates, startDate, endDate } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado",
        message: "Configure o token MAPBIOMAS_API_TOKEN nas variáveis de ambiente" 
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ 
        error: "Coordenadas inválidas",
        message: "Forneça pelo menos 3 pontos de coordenadas para formar um polígono" 
      });
    }

    const polygonCoords = coordinates.map((c: { latitude: number; longitude: number }) => 
      [c.longitude, c.latitude]
    );
    if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
        polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
      polygonCoords.push(polygonCoords[0]);
    }

    const geometry = {
      type: "Polygon",
      coordinates: [polygonCoords]
    };

    const query = `
      query PublishedAlerts($startDetectedAt: String!, $endDetectedAt: String!, $geometry: GeoJSONPolygonScalar) {
        publishedAlerts(
          startDetectedAt: $startDetectedAt
          endDetectedAt: $endDetectedAt
          geometry: $geometry
          limit: 50
        ) {
          data {
            alertCode
            detectedAt
            publishedAt
            areaHa
            source
            biome
            state
            city
          }
          total
        }
      }
    `;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const variables = {
      startDetectedAt: startDate || oneYearAgo.toISOString().split('T')[0],
      endDetectedAt: endDate || new Date().toISOString().split('T')[0],
      geometry
    };

    const response = await fetch(MAPBIOMAS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables })
    });

    const data: MapBiomasAlertResponse = await response.json();

    if (data.errors) {
      console.error("MapBiomas API errors:", data.errors);
      return res.status(400).json({ 
        error: "Erro na API MapBiomas",
        details: data.errors 
      });
    }

    res.json({
      success: true,
      alerts: data.data?.publishedAlerts?.data || [],
      total: data.data?.publishedAlerts?.total || 0
    });

  } catch (error) {
    console.error("Error fetching MapBiomas alerts:", error);
    res.status(500).json({ error: "Falha ao buscar alertas do MapBiomas" });
  }
});

router.get("/alert/:alertCode", async (req: Request, res: Response) => {
  try {
    const { alertCode } = req.params;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const query = `
      query GetAlert($alertCode: String!) {
        alert(alertCode: $alertCode) {
          alertCode
          detectedAt
          publishedAt
          areaHa
          source
          biome
          state
          city
          statusId
          alertInsideCARAreaHa
          geometry
          images {
            before {
              url
              satellite
              date
            }
            after {
              url
              satellite
              date
            }
          }
          ruralProperties {
            propertyCode
            status
            type
            areaHa
          }
          conservationUnits {
            name
            category
          }
          indigenousLands {
            name
            ethnicName
          }
          settlements {
            name
          }
          quilombolaAreas {
            name
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
      body: JSON.stringify({ query, variables: { alertCode } })
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
      alert: data.data?.alert || null
    });

  } catch (error) {
    console.error("Error fetching MapBiomas alert:", error);
    res.status(500).json({ error: "Falha ao buscar detalhes do alerta" });
  }
});

router.post("/land-cover", async (req: Request, res: Response) => {
  try {
    const { coordinates, year } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ 
        error: "Coordenadas inválidas" 
      });
    }

    const polygonCoords = coordinates.map((c: { latitude: number; longitude: number }) => 
      [c.longitude, c.latitude]
    );
    if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
        polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
      polygonCoords.push(polygonCoords[0]);
    }

    const geometry = {
      type: "Polygon",
      coordinates: [polygonCoords]
    };

    const currentYear = year || new Date().getFullYear() - 1;

    const query = `
      query LandCoverStats($geometry: GeoJSONPolygonScalar!, $year: Int!) {
        landCoverStats(geometry: $geometry, year: $year) {
          year
          classes {
            classId
            className
            areaHa
            percentage
          }
          totalAreaHa
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
        variables: { geometry, year: currentYear } 
      })
    });

    const data = await response.json();

    if (data.errors) {
      console.error("MapBiomas API errors:", data.errors);
      
      const mockLandCover = {
        year: currentYear,
        classes: [
          { classId: 3, className: "Formação Florestal", areaHa: 0, percentage: 0 },
          { classId: 4, className: "Formação Savânica", areaHa: 0, percentage: 0 },
          { classId: 9, className: "Silvicultura", areaHa: 0, percentage: 0 },
          { classId: 15, className: "Pastagem", areaHa: 0, percentage: 0 },
          { classId: 21, className: "Mosaico de Agricultura e Pastagem", areaHa: 0, percentage: 0 },
          { classId: 24, className: "Infraestrutura Urbana", areaHa: 0, percentage: 0 },
          { classId: 33, className: "Corpos d'Água", areaHa: 0, percentage: 0 }
        ],
        totalAreaHa: 0,
        message: "Dados de uso do solo não disponíveis para esta consulta. Verifique o token e a área."
      };

      return res.json({
        success: false,
        landCover: mockLandCover,
        error: data.errors[0]?.message || "Erro ao consultar dados de uso do solo"
      });
    }

    res.json({
      success: true,
      landCover: data.data?.landCoverStats || null
    });

  } catch (error) {
    console.error("Error fetching MapBiomas land cover:", error);
    res.status(500).json({ error: "Falha ao buscar dados de uso do solo" });
  }
});

router.get("/statistics/:state", async (req: Request, res: Response) => {
  try {
    const { state } = req.params;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const query = `
      query AlertStatistics($state: String!) {
        alertStatistics(state: $state) {
          totalAlerts
          totalAreaHa
          byBiome {
            biome
            count
            areaHa
          }
          bySource {
            source
            count
            areaHa
          }
          byYear {
            year
            count
            areaHa
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
      body: JSON.stringify({ query, variables: { state } })
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
      statistics: data.data?.alertStatistics || null
    });

  } catch (error) {
    console.error("Error fetching MapBiomas statistics:", error);
    res.status(500).json({ error: "Falha ao buscar estatísticas" });
  }
});

export default router;
