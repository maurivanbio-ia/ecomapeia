import { Router, Request, Response } from "express";

const router = Router();

const MAPBIOMAS_API_URL = "https://plataforma.alerta.mapbiomas.org/api/v2/graphql";

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
            cars {
              id
              code
              area
              intersectionArea
              type
            }
            ruralProperties {
              id
              code
              areaHa
              type
              alertAreaInCar
              alertGeometryCode
              alertInPropertyImage
              afterDeforestationSimplifiedImage
              layerImage
              propertyInStateImage
              insertedAt
              updatedAt
              version
              legalReserves {
                id
                areaHa
                carCode
                ruralPropertyId
                stateAcronym
                insertedAt
                updatedAt
                version
              }
              permanentProtectedAreas {
                id
                areaHa
                carCode
                ruralPropertyId
                stateAcronym
                insertedAt
                updatedAt
                version
              }
            }
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
          cars {
            id
            code
            area
            intersectionArea
            type
          }
          ruralProperties {
            id
            code
            areaHa
            type
            alertAreaInCar
            alertGeometryCode
            alertInPropertyImage
            afterDeforestationSimplifiedImage
            layerImage
            propertyInStateImage
            insertedAt
            updatedAt
            version
            legalReserves {
              id
              areaHa
              carCode
              ruralPropertyId
              stateAcronym
              insertedAt
              updatedAt
              version
            }
            permanentProtectedAreas {
              id
              areaHa
              carCode
              ruralPropertyId
              stateAcronym
              insertedAt
              updatedAt
              version
            }
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
          alertGeometryPoints {
            id
            number
            xCoord
            yCoord
            ruralPropertyId
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

router.post("/rural-properties", async (req: Request, res: Response) => {
  try {
    const { coordinates, carCode } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    let query: string;
    let variables: any;

    if (carCode) {
      query = `
        query RuralPropertyByCode($code: String!) {
          ruralProperty(code: $code) {
            id
            code
            areaHa
            type
            alertAreaInCar
            alertGeometryCode
            alertInPropertyImage
            afterDeforestationSimplifiedImage
            layerImage
            propertyInStateImage
            insertedAt
            updatedAt
            version
            legalReserves {
              id
              areaHa
              carCode
              ruralPropertyId
              stateAcronym
              insertedAt
              updatedAt
              version
            }
            permanentProtectedAreas {
              id
              areaHa
              carCode
              ruralPropertyId
              stateAcronym
              insertedAt
              updatedAt
              version
            }
          }
        }
      `;
      variables = { code: carCode };
    } else if (coordinates && Array.isArray(coordinates) && coordinates.length >= 3) {
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

      query = `
        query RuralPropertiesByGeometry($geometry: GeoJSONPolygonScalar!) {
          ruralProperties(geometry: $geometry, limit: 20) {
            data {
              id
              code
              areaHa
              type
              alertAreaInCar
              alertGeometryCode
              alertInPropertyImage
              afterDeforestationSimplifiedImage
              layerImage
              propertyInStateImage
              insertedAt
              updatedAt
              version
              legalReserves {
                id
                areaHa
                carCode
                ruralPropertyId
                stateAcronym
              }
              permanentProtectedAreas {
                id
                areaHa
                carCode
                ruralPropertyId
                stateAcronym
              }
            }
            total
          }
        }
      `;
      variables = { geometry };
    } else {
      return res.status(400).json({ 
        error: "Forneça coordenadas ou código CAR" 
      });
    }

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

    if (carCode) {
      res.json({
        success: true,
        ruralProperty: data.data?.ruralProperty || null
      });
    } else {
      res.json({
        success: true,
        ruralProperties: data.data?.ruralProperties?.data || [],
        total: data.data?.ruralProperties?.total || 0
      });
    }

  } catch (error) {
    console.error("Error fetching rural properties:", error);
    res.status(500).json({ error: "Falha ao buscar propriedades rurais" });
  }
});

router.get("/class-labels", async (req: Request, res: Response) => {
  try {
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    const query = `
      query ClassLabels {
        classLabels {
          name
          colors
          colorsWithLabels
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
      classLabels: data.data?.classLabels || []
    });

  } catch (error) {
    console.error("Error fetching class labels:", error);
    res.status(500).json({ error: "Falha ao buscar legendas de classes" });
  }
});

router.post("/legal-reserves", async (req: Request, res: Response) => {
  try {
    const { coordinates, carCode } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!coordinates && !carCode) {
      return res.status(400).json({ 
        error: "Forneça coordenadas ou código CAR" 
      });
    }

    let geometry = null;
    if (coordinates && Array.isArray(coordinates) && coordinates.length >= 3) {
      const polygonCoords = coordinates.map((c: { latitude: number; longitude: number }) => 
        [c.longitude, c.latitude]
      );
      if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
          polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
        polygonCoords.push(polygonCoords[0]);
      }
      geometry = {
        type: "Polygon",
        coordinates: [polygonCoords]
      };
    }

    const query = `
      query LegalReserves($geometry: GeoJSONPolygonScalar, $carCode: String) {
        legalReserves(geometry: $geometry, carCode: $carCode, limit: 50) {
          data {
            id
            areaHa
            carCode
            ruralPropertyId
            stateAcronym
            insertedAt
            updatedAt
            version
            ruralProperty {
              id
              code
              areaHa
              type
            }
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
      body: JSON.stringify({ 
        query, 
        variables: { geometry, carCode } 
      })
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
      legalReserves: data.data?.legalReserves?.data || [],
      total: data.data?.legalReserves?.total || 0
    });

  } catch (error) {
    console.error("Error fetching legal reserves:", error);
    res.status(500).json({ error: "Falha ao buscar reservas legais" });
  }
});

router.post("/permanent-protected-areas", async (req: Request, res: Response) => {
  try {
    const { coordinates, carCode } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!coordinates && !carCode) {
      return res.status(400).json({ 
        error: "Forneça coordenadas ou código CAR" 
      });
    }

    let geometry = null;
    if (coordinates && Array.isArray(coordinates) && coordinates.length >= 3) {
      const polygonCoords = coordinates.map((c: { latitude: number; longitude: number }) => 
        [c.longitude, c.latitude]
      );
      if (polygonCoords[0][0] !== polygonCoords[polygonCoords.length - 1][0] ||
          polygonCoords[0][1] !== polygonCoords[polygonCoords.length - 1][1]) {
        polygonCoords.push(polygonCoords[0]);
      }
      geometry = {
        type: "Polygon",
        coordinates: [polygonCoords]
      };
    }

    const query = `
      query PermanentProtectedAreas($geometry: GeoJSONPolygonScalar, $carCode: String) {
        permanentProtectedAreas(geometry: $geometry, carCode: $carCode, limit: 50) {
          data {
            id
            areaHa
            carCode
            ruralPropertyId
            stateAcronym
            insertedAt
            updatedAt
            version
            ruralProperty {
              id
              code
              areaHa
              type
            }
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
      body: JSON.stringify({ 
        query, 
        variables: { geometry, carCode } 
      })
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
      permanentProtectedAreas: data.data?.permanentProtectedAreas?.data || [],
      total: data.data?.permanentProtectedAreas?.total || 0
    });

  } catch (error) {
    console.error("Error fetching permanent protected areas:", error);
    res.status(500).json({ error: "Falha ao buscar APPs" });
  }
});

router.post("/full-analysis", async (req: Request, res: Response) => {
  try {
    const { coordinates } = req.body;
    const token = process.env.MAPBIOMAS_API_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: "Token da API MapBiomas não configurado" 
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
      return res.status(400).json({ 
        error: "Forneça pelo menos 3 pontos de coordenadas" 
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

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const query = `
      query FullAnalysis(
        $geometry: GeoJSONPolygonScalar!
        $startDetectedAt: String!
        $endDetectedAt: String!
      ) {
        publishedAlerts(
          geometry: $geometry
          startDetectedAt: $startDetectedAt
          endDetectedAt: $endDetectedAt
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
            cars {
              id
              code
              area
              intersectionArea
              type
            }
            ruralProperties {
              id
              code
              areaHa
              type
              alertAreaInCar
              legalReserves {
                id
                areaHa
                carCode
              }
              permanentProtectedAreas {
                id
                areaHa
                carCode
              }
            }
          }
          total
        }
        ruralProperties(geometry: $geometry, limit: 20) {
          data {
            id
            code
            areaHa
            type
            alertAreaInCar
            alertGeometryCode
            alertInPropertyImage
            afterDeforestationSimplifiedImage
            layerImage
            propertyInStateImage
            legalReserves {
              id
              areaHa
              carCode
              stateAcronym
            }
            permanentProtectedAreas {
              id
              areaHa
              carCode
              stateAcronym
            }
          }
          total
        }
      }
    `;

    const variables = {
      geometry,
      startDetectedAt: oneYearAgo.toISOString().split('T')[0],
      endDetectedAt: new Date().toISOString().split('T')[0]
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

    const alerts = data.data?.publishedAlerts?.data || [];
    const ruralProperties = data.data?.ruralProperties?.data || [];

    let totalLegalReserveArea = 0;
    let totalAPPArea = 0;
    let totalAlertArea = 0;

    ruralProperties.forEach((prop: any) => {
      prop.legalReserves?.forEach((lr: any) => {
        totalLegalReserveArea += lr.areaHa || 0;
      });
      prop.permanentProtectedAreas?.forEach((app: any) => {
        totalAPPArea += app.areaHa || 0;
      });
    });

    alerts.forEach((alert: any) => {
      totalAlertArea += alert.areaHa || 0;
    });

    res.json({
      success: true,
      summary: {
        totalAlerts: alerts.length,
        totalAlertAreaHa: totalAlertArea,
        totalRuralProperties: ruralProperties.length,
        totalLegalReserveAreaHa: totalLegalReserveArea,
        totalAPPAreaHa: totalAPPArea
      },
      alerts,
      ruralProperties,
      alertsTotal: data.data?.publishedAlerts?.total || 0,
      ruralPropertiesTotal: data.data?.ruralProperties?.total || 0
    });

  } catch (error) {
    console.error("Error fetching full analysis:", error);
    res.status(500).json({ error: "Falha ao realizar análise completa" });
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
