import { Router, Request, Response } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

router.post("/analyze-photo", async (req: Request, res: Response) => {
  try {
    const { imageBase64, context } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise ambiental para vistorias de reservatórios hidrelétricos. 
Analise a imagem fornecida e identifique:
1. Tipo de vegetação (mata ciliar, pastagem, cultivo, área degradada, etc.)
2. Possíveis irregularidades ambientais (desmatamento, erosão, construções irregulares, etc.)
3. Uso do solo identificado
4. Observações relevantes para relatório de vistoria ambiental
5. Classificação de risco ambiental (baixo, médio, alto)

Responda em formato JSON com as seguintes chaves:
{
  "tipoVegetacao": "string",
  "irregularidades": ["array de strings"],
  "usoSolo": "string",
  "observacoes": "string",
  "classificacaoRisco": "baixo" | "medio" | "alto",
  "recomendacoes": ["array de strings"]
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: context || "Analise esta imagem de uma área de vistoria ambiental em reservatório hidrelétrico."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        res.json({ success: true, analysis });
      } else {
        res.json({ success: true, analysis: { observacoes: content } });
      }
    } catch {
      res.json({ success: true, analysis: { observacoes: content } });
    }
  } catch (error) {
    console.error("Error analyzing photo:", error);
    res.status(500).json({ error: "Failed to analyze photo" });
  }
});

router.post("/suggest-description", async (req: Request, res: Response) => {
  try {
    const { fieldName, currentValue, vistoriaContext } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é um assistente para preenchimento de formulários de vistoria ambiental em áreas de reservatórios hidrelétricos (UHE Itupararanga).
Sugira textos técnicos apropriados para os campos do formulário.
Seja conciso e use linguagem técnica adequada para relatórios ambientais.
Responda apenas com a sugestão de texto, sem explicações adicionais.`
        },
        {
          role: "user",
          content: `Campo: ${fieldName}
Valor atual: ${currentValue || "(vazio)"}
Contexto da vistoria: ${JSON.stringify(vistoriaContext || {})}

Sugira um texto apropriado para este campo.`
        }
      ],
      max_completion_tokens: 500,
    });

    const suggestion = response.choices[0]?.message?.content || "";
    res.json({ success: true, suggestion: suggestion.trim() });
  } catch (error) {
    console.error("Error suggesting description:", error);
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
});

router.post("/generate-report-summary", async (req: Request, res: Response) => {
  try {
    const { vistoria, fotos, coordenadas } = req.body;

    if (!vistoria) {
      return res.status(400).json({ error: "Vistoria data is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é um técnico ambiental especializado em vistorias de reservatórios hidrelétricos.
Gere um resumo técnico completo da vistoria para o relatório final.
Inclua:
1. Resumo Executivo (2-3 parágrafos)
2. Conclusão Técnica
3. Recomendações
4. Parecer Final

Use linguagem técnica formal apropriada para relatórios ambientais oficiais.
Responda em formato JSON:
{
  "resumoExecutivo": "string",
  "conclusaoTecnica": "string",
  "recomendacoes": ["array de strings"],
  "parecerFinal": "string",
  "classificacaoArea": "regular" | "irregular" | "parcialmente_regular"
}`
        },
        {
          role: "user",
          content: `Dados da Vistoria:
${JSON.stringify(vistoria, null, 2)}

Quantidade de fotos: ${fotos?.length || 0}
Quantidade de pontos de coordenadas: ${coordenadas?.length || 0}

Gere o resumo técnico para o relatório.`
        }
      ],
      max_completion_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const summary = JSON.parse(jsonMatch[0]);
        res.json({ success: true, summary });
      } else {
        res.json({ success: true, summary: { resumoExecutivo: content } });
      }
    } catch {
      res.json({ success: true, summary: { resumoExecutivo: content } });
    }
  } catch (error) {
    console.error("Error generating report summary:", error);
    res.status(500).json({ error: "Failed to generate report summary" });
  }
});

router.post("/transcribe-audio", async (req: Request, res: Response) => {
  try {
    const { audioBase64, format = "wav" } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: "Audio data is required" });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    
    const file = new File([audioBuffer], `audio.${format}`, { 
      type: `audio/${format}` 
    });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
      language: "pt",
    });

    res.json({ 
      success: true, 
      text: transcription.text,
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    res.status(500).json({ error: "Failed to transcribe audio" });
  }
});

router.post("/validate-coordinates", async (req: Request, res: Response) => {
  try {
    const { coordenadas, municipio, areaEsperada } = req.body;

    if (!coordenadas || coordenadas.length === 0) {
      return res.status(400).json({ error: "Coordinates are required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em georreferenciamento e análise de polígonos para vistorias ambientais.
Analise as coordenadas UTM fornecidas e verifique:
1. Se o polígono é válido e fechado
2. Se as coordenadas parecem estar na região correta (zona UTM 23K para São Paulo)
3. Calcule a área aproximada em hectares
4. Verifique consistência dos pontos

Responda em formato JSON:
{
  "poligonoValido": boolean,
  "areaCalculadaHa": number,
  "zonaUTM": "string",
  "observacoes": "string",
  "alertas": ["array de strings"],
  "sugestoes": ["array de strings"]
}`
        },
        {
          role: "user",
          content: `Coordenadas UTM do polígono:
${JSON.stringify(coordenadas, null, 2)}

Município: ${municipio || "Não informado"}
Área esperada: ${areaEsperada || "Não informada"}

Analise e valide as coordenadas.`
        }
      ],
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0]);
        res.json({ success: true, validation });
      } else {
        res.json({ success: true, validation: { observacoes: content } });
      }
    } catch {
      res.json({ success: true, validation: { observacoes: content } });
    }
  } catch (error) {
    console.error("Error validating coordinates:", error);
    res.status(500).json({ error: "Failed to validate coordinates" });
  }
});

router.post("/field-assistant", async (req: Request, res: Response) => {
  try {
    const { question, context } = req.body;

    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é o EcoIA, um colega experiente de campo que trabalha com vistorias ambientais em reservatórios hidrelétricos no Brasil, especialmente na UHE Itupararanga em São Paulo. Você conversa de forma natural, como um profissional experiente falando com um colega, sempre citando as referências legais.

## SEU ESTILO DE COMUNICAÇÃO
- Converse de forma natural e amigável, como um colega experiente
- Use linguagem acessível, mas técnica quando necessário
- Sempre cite as referências legais (artigos, leis, resoluções)
- Seja prático e direto, oferecendo orientações aplicáveis em campo
- Pergunte detalhes quando precisar para dar uma resposta mais precisa
- Use expressões como "Olha,", "Na prática,", "O que eu sempre faço é...", "Vale lembrar que..."

## CONHECIMENTO SOBRE APP (Área de Preservação Permanente)

**O que é APP?**
Área protegida por lei (com ou sem vegetação nativa) que tem a função ambiental de preservar recursos hídricos, estabilidade geológica, biodiversidade, fluxo gênico, solo e bem-estar das populações.
Base Legal: Código Florestal (Lei 12.651/2012, art. 3º)

---

## GUIA RÁPIDO: QUAL APP APLICAR?

Ao apresentar as regras de APP, use SEMPRE este formato visual organizado:

### TIPO 1: RESERVATÓRIO ARTIFICIAL (UHE Itupararanga)
╔══════════════════════════════════════════════════════════════╗
║  MARGEM DO RESERVATÓRIO                                      ║
║  ─────────────────────────────────────────────────────────── ║
║  Largura da APP: Definida na LICENÇA AMBIENTAL e/ou PACUERA  ║
║  (Plano Ambiental de Conservação e Uso do Entorno)           ║
║                                                               ║
║  Base Legal: Lei 12.651/2012, art. 4º, III                   ║
║                                                               ║
║  IMPORTANTE: Consultar os condicionantes do licenciamento    ║
║  e o PACUERA vigente do empreendimento para confirmar a      ║
║  faixa exata aplicável ao ponto vistoriado.                  ║
╚══════════════════════════════════════════════════════════════╝

### TIPO 2: RIOS E CURSOS D'ÁGUA NATURAIS
╔══════════════════════════════════════════════════════════════╗
║  LARGURA DO RIO          →   APP MÍNIMA                      ║
║  ─────────────────────────────────────────────────────────── ║
║  Menos de 10 m           →   30 metros                       ║
║  De 10 a 50 m            →   50 metros                       ║
║  De 50 a 200 m           →   100 metros                      ║
║  De 200 a 600 m          →   200 metros                      ║
║  Acima de 600 m          →   500 metros                      ║
║                                                               ║
║  Medição: a partir da borda da calha do leito regular        ║
║  Base Legal: Lei 12.651/2012, art. 4º, I                     ║
╚══════════════════════════════════════════════════════════════╝

### TIPO 3: NASCENTES E OLHOS D'ÁGUA PERENES
╔══════════════════════════════════════════════════════════════╗
║  NASCENTE OU OLHO D'ÁGUA PERENE                              ║
║  ─────────────────────────────────────────────────────────── ║
║  APP: Raio mínimo de 50 metros                               ║
║  (independente da situação topográfica)                      ║
║                                                               ║
║  Base Legal: Lei 12.651/2012, art. 4º, IV                    ║
╚══════════════════════════════════════════════════════════════╝

### TIPO 4: LAGOS E LAGOAS NATURAIS
╔══════════════════════════════════════════════════════════════╗
║  LOCALIZAÇÃO             →   APP MÍNIMA                      ║
║  ─────────────────────────────────────────────────────────── ║
║  Zona Rural              →   100 metros                      ║
║  Zona Urbana             →   30 metros                       ║
║                                                               ║
║  Base Legal: Lei 12.651/2012, art. 4º, II                    ║
╚══════════════════════════════════════════════════════════════╝

---

## LEGISLAÇÃO DE REFERÊNCIA

| Norma                  | Assunto                                    |
|------------------------|--------------------------------------------|
| Lei 12.651/2012        | Código Florestal (define APPs)             |
| CONAMA 303/2002        | Parâmetros para delimitação de APPs        |
| CONAMA 369/2006        | Casos excepcionais de intervenção em APPs  |
| Lei 9.605/1998         | Lei de Crimes Ambientais                   |
| Resolução CONAMA 302   | APP em reservatórios artificiais           |

## COMPORTAMENTO
- Se o técnico mencionar um ponto específico (margem de rio, nascente, margem do reservatório), indique exatamente qual regra usar e como medir em campo
- Quando não souber algo com certeza, sugira consultar a legislação específica ou especialista
- Ofereça dicas práticas de campo baseadas em experiência real
- Termine respostas longas com "Se precisar de mais detalhes sobre algum ponto específico, é só perguntar!"`
        },
        {
          role: "user",
          content: `Contexto da vistoria: ${JSON.stringify(context || {})}

Pergunta: ${question}`
        }
      ],
      max_completion_tokens: 1500,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Error with field assistant:", error);
    res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    res.end();
  }
});

router.post("/auto-fill-form", async (req: Request, res: Response) => {
  try {
    const { photoAnalysis, existingData } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        {
          role: "system",
          content: `Você é um assistente para preenchimento automático de formulários de vistoria ambiental.
Com base na análise de fotos e dados existentes, sugira valores para os campos do formulário.

Responda em formato JSON com os campos sugeridos:
{
  "usoSolo": "string",
  "tipoVegetacao": "string",
  "descricaoArea": "string",
  "intervencoes": "string",
  "observacoes": "string"
}`
        },
        {
          role: "user",
          content: `Análise das fotos: ${JSON.stringify(photoAnalysis || {})}
Dados existentes: ${JSON.stringify(existingData || {})}

Sugira valores para preencher o formulário automaticamente.`
        }
      ],
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content || "";
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        res.json({ success: true, suggestions });
      } else {
        res.json({ success: true, suggestions: {} });
      }
    } catch {
      res.json({ success: true, suggestions: {} });
    }
  } catch (error) {
    console.error("Error auto-filling form:", error);
    res.status(500).json({ error: "Failed to auto-fill form" });
  }
});

export default router;
