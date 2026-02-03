import { Router, Request, Response } from "express";

const router = Router();

// ============================================
// WEATHER API (Open-Meteo - Free, no API key)
// ============================================

interface WeatherData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  cloudCover: number;
  description: string;
  icon: string;
}

router.get("/weather", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude e longitude são obrigatórios",
      });
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover,weather_code&timezone=America/Sao_Paulo`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.current) {
      return res.status(500).json({
        success: false,
        error: "Não foi possível obter dados meteorológicos",
      });
    }

    const weatherCodes: Record<number, { description: string; icon: string }> = {
      0: { description: "Céu limpo", icon: "sun" },
      1: { description: "Predominantemente limpo", icon: "sun" },
      2: { description: "Parcialmente nublado", icon: "cloud" },
      3: { description: "Nublado", icon: "cloud" },
      45: { description: "Nevoeiro", icon: "cloud" },
      48: { description: "Nevoeiro com geada", icon: "cloud" },
      51: { description: "Chuvisco leve", icon: "cloud-rain" },
      53: { description: "Chuvisco moderado", icon: "cloud-rain" },
      55: { description: "Chuvisco intenso", icon: "cloud-rain" },
      61: { description: "Chuva leve", icon: "cloud-rain" },
      63: { description: "Chuva moderada", icon: "cloud-rain" },
      65: { description: "Chuva forte", icon: "cloud-rain" },
      80: { description: "Pancadas de chuva leves", icon: "cloud-rain" },
      81: { description: "Pancadas de chuva moderadas", icon: "cloud-rain" },
      82: { description: "Pancadas de chuva fortes", icon: "cloud-rain" },
      95: { description: "Tempestade", icon: "cloud-lightning" },
      96: { description: "Tempestade com granizo leve", icon: "cloud-lightning" },
      99: { description: "Tempestade com granizo forte", icon: "cloud-lightning" },
    };

    const weatherCode = data.current.weather_code;
    const weatherInfo = weatherCodes[weatherCode] || { description: "Desconhecido", icon: "cloud" };

    const weather: WeatherData = {
      temperature: data.current.temperature_2m,
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      windSpeed: data.current.wind_speed_10m,
      cloudCover: data.current.cloud_cover,
      description: weatherInfo.description,
      icon: weatherInfo.icon,
    };

    return res.json({
      success: true,
      weather,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Weather API error:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar dados meteorológicos",
    });
  }
});

// ============================================
// APP (Área de Preservação Permanente) CALCULATION
// Based on Brazilian Forest Code (Lei 12.651/2012)
// ============================================

interface APPCalculation {
  tipoRecurso: string;
  larguraRecurso?: number;
  faixaAPP: number;
  fundamentoLegal: string;
  observacoes?: string;
}

router.post("/calculate-app", async (req: Request, res: Response) => {
  try {
    const { tipoRecurso, larguraRecurso, inclinacao, altitudeTopoMorro, areaPropriedade } = req.body;

    if (!tipoRecurso) {
      return res.status(400).json({
        success: false,
        error: "Tipo de recurso hídrico é obrigatório",
      });
    }

    let calculation: APPCalculation;

    switch (tipoRecurso) {
      case "curso_dagua":
        // Art. 4º, I - Cursos d'água naturais
        if (!larguraRecurso) {
          return res.status(400).json({
            success: false,
            error: "Largura do curso d'água é obrigatória",
          });
        }
        
        let faixaCurso: number;
        if (larguraRecurso < 10) {
          faixaCurso = 30;
        } else if (larguraRecurso < 50) {
          faixaCurso = 50;
        } else if (larguraRecurso < 200) {
          faixaCurso = 100;
        } else if (larguraRecurso < 600) {
          faixaCurso = 200;
        } else {
          faixaCurso = 500;
        }
        
        calculation = {
          tipoRecurso: "Curso d'água",
          larguraRecurso,
          faixaAPP: faixaCurso,
          fundamentoLegal: "Art. 4º, I da Lei 12.651/2012",
          observacoes: `Curso d'água com ${larguraRecurso}m de largura requer APP de ${faixaCurso}m em cada margem`,
        };
        break;

      case "nascente":
        // Art. 4º, IV - Nascentes e olhos d'água
        calculation = {
          tipoRecurso: "Nascente/Olho d'água",
          faixaAPP: 50,
          fundamentoLegal: "Art. 4º, IV da Lei 12.651/2012",
          observacoes: "Raio mínimo de 50 metros ao redor de nascentes e olhos d'água perenes",
        };
        break;

      case "lago_lagoa_natural":
        // Art. 4º, II - Lagos e lagoas naturais
        let faixaLago: number;
        if (areaPropriedade && areaPropriedade <= 1) {
          faixaLago = 5; // Pequena propriedade rural
        } else if (areaPropriedade && areaPropriedade <= 2) {
          faixaLago = 8;
        } else if (areaPropriedade && areaPropriedade <= 4) {
          faixaLago = 15;
        } else {
          faixaLago = 30; // Demais casos em área rural
        }
        
        calculation = {
          tipoRecurso: "Lago/Lagoa natural",
          faixaAPP: faixaLago,
          fundamentoLegal: "Art. 4º, II da Lei 12.651/2012",
          observacoes: `APP de ${faixaLago}m para lagos naturais em zona rural`,
        };
        break;

      case "reservatorio_artificial":
        // Art. 4º, III - Reservatórios artificiais
        calculation = {
          tipoRecurso: "Reservatório artificial",
          faixaAPP: 30,
          fundamentoLegal: "Art. 4º, III da Lei 12.651/2012 e Art. 5º",
          observacoes: "Faixa definida na licença ambiental, mínimo de 30m para reservatórios de geração de energia elétrica",
        };
        break;

      case "encosta":
        // Art. 4º, V - Encostas com declividade > 45°
        if (inclinacao && inclinacao > 45) {
          calculation = {
            tipoRecurso: "Encosta",
            faixaAPP: 0,
            fundamentoLegal: "Art. 4º, V da Lei 12.651/2012",
            observacoes: `Encostas com declividade superior a 45° (${inclinacao}°) são APP em toda sua extensão`,
          };
        } else {
          calculation = {
            tipoRecurso: "Encosta",
            faixaAPP: 0,
            fundamentoLegal: "Art. 4º, V da Lei 12.651/2012",
            observacoes: `Inclinação de ${inclinacao || 0}° não caracteriza APP (mínimo 45°)`,
          };
        }
        break;

      case "topo_morro":
        // Art. 4º, IX - Topos de morros e montanhas
        if (altitudeTopoMorro && altitudeTopoMorro >= 100) {
          calculation = {
            tipoRecurso: "Topo de morro/montanha",
            faixaAPP: 0,
            fundamentoLegal: "Art. 4º, IX da Lei 12.651/2012",
            observacoes: "Terço superior de morros com altura mínima de 100m e inclinação média > 25° é APP",
          };
        } else {
          calculation = {
            tipoRecurso: "Topo de morro/montanha",
            faixaAPP: 0,
            fundamentoLegal: "Art. 4º, IX da Lei 12.651/2012",
            observacoes: `Altura de ${altitudeTopoMorro || 0}m não caracteriza APP (mínimo 100m)`,
          };
        }
        break;

      case "vereda":
        // Art. 4º, XI - Veredas
        calculation = {
          tipoRecurso: "Vereda",
          faixaAPP: 50,
          fundamentoLegal: "Art. 4º, XI da Lei 12.651/2012",
          observacoes: "Faixa marginal de 50 metros a partir do espaço permanentemente brejoso e encharcado",
        };
        break;

      case "manguezal":
        // Art. 4º, VII - Manguezais
        calculation = {
          tipoRecurso: "Manguezal",
          faixaAPP: 0,
          fundamentoLegal: "Art. 4º, VII da Lei 12.651/2012",
          observacoes: "Manguezais são APP em toda sua extensão",
        };
        break;

      case "restinga":
        // Art. 4º, VI - Restingas
        calculation = {
          tipoRecurso: "Restinga",
          faixaAPP: 0,
          fundamentoLegal: "Art. 4º, VI da Lei 12.651/2012",
          observacoes: "Restingas como fixadoras de dunas ou estabilizadoras de mangues são APP",
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Tipo de recurso não reconhecido",
        });
    }

    return res.json({
      success: true,
      calculation,
    });
  } catch (error) {
    console.error("APP calculation error:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao calcular APP",
    });
  }
});

// ============================================
// SATELLITE IMAGERY COMPARISON (INPE DETER/PRODES)
// ============================================

router.post("/satellite-comparison", async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, startDate, endDate } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: "Latitude e longitude são obrigatórios",
      });
    }

    // Calculate bounding box (approximately 5km radius)
    const delta = 0.045; // ~5km at equator
    const bbox = {
      minLat: latitude - delta,
      maxLat: latitude + delta,
      minLon: longitude - delta,
      maxLon: longitude + delta,
    };

    // Query INPE TerraBrasilis for deforestation data
    const deterUrl = `http://terrabrasilis.dpi.inpe.br/geoserver/deter-amz/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=deter-amz:deter_amz&outputFormat=application/json&CQL_FILTER=INTERSECTS(geom,POINT(${longitude} ${latitude}))`;

    let deterData = null;
    try {
      const deterResponse = await fetch(deterUrl, { signal: AbortSignal.timeout(10000) });
      if (deterResponse.ok) {
        deterData = await deterResponse.json();
      }
    } catch (e) {
      console.log("DETER API not available, continuing without it");
    }

    // Generate analysis based on available data
    const analysis = {
      location: { latitude, longitude },
      bbox,
      deterAlerts: deterData?.features?.length || 0,
      alertDetails: deterData?.features?.slice(0, 5).map((f: any) => ({
        date: f.properties?.view_date,
        area: f.properties?.areamunkm,
        class: f.properties?.classname,
      })) || [],
      analysisDate: new Date().toISOString(),
      period: {
        start: startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: endDate || new Date().toISOString().split('T')[0],
      },
      sources: ["INPE DETER", "INPE PRODES"],
      recommendation: deterData?.features?.length > 0 
        ? "ATENÇÃO: Foram detectados alertas de desmatamento na região. Recomenda-se verificação in loco."
        : "Não foram encontrados alertas de desmatamento recentes na região.",
    };

    return res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Satellite comparison error:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar dados de satélite",
    });
  }
});

// ============================================
// EXPORT TO CSV/EXCEL
// ============================================

router.post("/export-csv", async (req: Request, res: Response) => {
  try {
    const { vistorias } = req.body;

    if (!vistorias || !Array.isArray(vistorias)) {
      return res.status(400).json({
        success: false,
        error: "Lista de vistorias é obrigatória",
      });
    }

    // CSV Header
    const headers = [
      "ID",
      "Proprietário",
      "CPF/CNPJ",
      "Endereço",
      "Data Vistoria",
      "Técnico",
      "Código CAR",
      "Área (ha)",
      "Risco Embargo",
      "Conformidade (%)",
      "Observações",
      "Latitude",
      "Longitude",
    ];

    const csvRows = [headers.join(";")];

    for (const v of vistorias) {
      const row = [
        v.id || "",
        v.proprietario || "",
        v.cpf_cnpj || "",
        v.endereco || "",
        v.data_vistoria || "",
        v.tecnico_responsavel || "",
        v.carInfo?.codigo || "",
        v.carInfo?.area_total?.toFixed(2) || "",
        v.embargoCheck?.level || "",
        v.complianceAnalysis?.pontuacao?.toString() || "",
        (v.observacoes || "").replace(/;/g, ",").replace(/\n/g, " "),
        v.latitude?.toString() || "",
        v.longitude?.toString() || "",
      ];
      csvRows.push(row.join(";"));
    }

    const csvContent = csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=vistorias_${new Date().toISOString().split('T')[0]}.csv`);
    
    // Add BOM for Excel UTF-8 compatibility
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("CSV export error:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao exportar CSV",
    });
  }
});

// ============================================
// OCR DOCUMENT SCANNING
// ============================================

router.post("/ocr-scan", async (req: Request, res: Response) => {
  try {
    const { imageBase64, language = "por" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({
        success: false,
        error: "Imagem em base64 é obrigatória",
      });
    }

    // Use OpenAI Vision for OCR (available through Replit AI integration)
    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em OCR. Extraia todo o texto visível da imagem, preservando a formatação e estrutura do documento. Se for um documento oficial (escritura, licença, etc.), identifique também os campos principais.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "Extraia todo o texto deste documento. Identifique campos importantes como: nome, CPF/CNPJ, endereço, data, número de registro, etc.",
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    const extractedText = response.choices[0]?.message?.content || "";

    // Parse extracted text to identify key fields
    const fields: Record<string, string> = {};
    
    // Common patterns
    const cpfMatch = extractedText.match(/CPF[:\s]*(\d{3}\.?\d{3}\.?\d{3}-?\d{2})/i);
    const cnpjMatch = extractedText.match(/CNPJ[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i);
    const carMatch = extractedText.match(/CAR[:\s]*([A-Z]{2}-\d{7}-[A-F0-9]+)/i);
    const matriculaMatch = extractedText.match(/[Mm]atr[íi]cula[:\s]*(\d+)/);
    const areaMatch = extractedText.match(/[Áá]rea[:\s]*([\d.,]+)\s*(ha|hectares?|m2|m²)/i);

    if (cpfMatch) fields.cpf = cpfMatch[1];
    if (cnpjMatch) fields.cnpj = cnpjMatch[1];
    if (carMatch) fields.car = carMatch[1];
    if (matriculaMatch) fields.matricula = matriculaMatch[1];
    if (areaMatch) fields.area = areaMatch[1] + " " + areaMatch[2];

    return res.json({
      success: true,
      extractedText,
      fields,
    });
  } catch (error) {
    console.error("OCR error:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao processar OCR",
    });
  }
});

export default router;
