import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";

const router = Router();

interface UsoSolo {
  tipo: string;
  valor: string;
  unidade: string;
  coordenada?: { utm_e: string; utm_n: string; lat: number; lng: number } | null;
}

interface EmbargoCheck {
  level: "LOW" | "MEDIUM" | "HIGH";
  hasEmbargoRisk: boolean;
  isInsideProtectedArea?: boolean;
  protectedAreaName?: string;
  protectionLevel?: string;
  reasons?: string[];
  recommendations?: string[];
}

interface ComplianceRisk {
  tipo: string;
  nivel: string;
  descricao: string;
  fundamentacaoLegal?: string;
}

interface ComplianceAnalysis {
  conformidadeGeral: "CONFORME" | "PARCIALMENTE_CONFORME" | "NAO_CONFORME";
  pontuacao: number;
  riscos?: ComplianceRisk[];
  recomendacoes?: string[];
  resumoExecutivo?: string;
}

interface CARInfo {
  codigo?: string;
  municipio?: string;
  uf?: string;
  area_total?: number;
  situacao?: string;
}

interface UCInfo {
  name?: string;
  category?: string;
  categoryName?: string;
  distanceKm?: number;
  isInside?: boolean;
  state?: string;
  biome?: string;
  restrictionType?: string;
  areaKm2?: number;
}

interface WeatherData {
  temperatura?: number;
  umidade?: number;
  condicoes?: string;
  velocidade_vento?: number;
  direcao_vento?: string;
  nebulosidade?: number;
}

interface VistoriaData {
  id: string;
  numero_notificacao?: string;
  setor?: string;
  margem?: string;
  municipio?: string;
  uf?: string;
  localizacao?: string;
  proprietario: string;
  loteamento_condominio?: string;
  tipo_inspecao: string;
  data_vistoria: string;
  hora_vistoria?: string;
  zona_utm?: string;
  tipo_intervencao?: string;
  intervencao?: string;
  detalhamento_intervencao?: string;
  emissao_notificacao?: string;
  reincidente?: string;
  observacoes?: string;
  observacoes_usos?: string;
  fotos?: Array<{ uri: string; legenda: string }>;
  coordenadas_utm?: Array<{ e: string; n: string }>;
  usos_solo?: UsoSolo[];
  croqui_imagem?: string;
  assinatura_uri?: string;
  assinatura_tecnico_uri?: string;
  embargoCheck?: EmbargoCheck;
  complianceAnalysis?: ComplianceAnalysis;
  carInfo?: CARInfo;
  ucInfo?: UCInfo;
  tiInfo?: {
    nome: string;
    etnia: string;
    municipio: string;
    uf: string;
    fase: string;
    area_ha: number;
    distanceKm: number;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
  };
  weather_data?: WeatherData;
  projeto_nome?: string;
}

function getLogoBase64(filename: string): string {
  try {
    const logoPath = path.join(__dirname, "../assets", filename);
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch (error) {
    console.error(`Error loading logo ${filename}:`, error);
  }
  return "";
}

function getCBALogoBase64(): string {
  return getLogoBase64("cba_logo.png");
}

function getEcoBrasilLogoBase64(): string {
  return getLogoBase64("ecobrasil_logo.png");
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function generatePDFHTML(vistoria: VistoriaData): string {
  const logoBase64 = getCBALogoBase64();
  const ecoBrasilLogoBase64 = getEcoBrasilLogoBase64();
  
  const usosSoloHTML = vistoria.usos_solo?.length
    ? vistoria.usos_solo
        .map(
          (uso) => `
          <tr>
            <td style="width: 60%;">${uso.tipo}</td>
            <td style="text-align: center;">${uso.valor || "-"}</td>
            <td style="text-align: center;">${uso.unidade}</td>
            <td style="text-align: center; font-size:9pt; color:#555;">
              ${uso.coordenada ? `E:${uso.coordenada.utm_e} N:${uso.coordenada.utm_n}` : "-"}
            </td>
          </tr>
        `
        )
        .join("")
    : `<tr><td colspan="4" style="text-align: center;">Nenhum uso identificado</td></tr>`;

  const coordenadasHTML = vistoria.coordenadas_utm?.length
    ? vistoria.coordenadas_utm
        .map(
          (coord, idx) => `
          <tr>
            <td style="text-align: center;">${idx + 1}</td>
            <td style="text-align: center;">${coord.e}</td>
            <td style="text-align: center;">${coord.n}</td>
          </tr>
        `
        )
        .join("")
    : `<tr><td colspan="3" style="text-align: center;">-</td></tr>`;

  const USO_TIPOS = [
    "Acesso", "Edificação", "Píer fixo", "Píer Flutuante", "Área de Lazer",
    "Praia artificial", "Rampa para Embarcação", "Embarcações", "Lavoura",
    "Pastagem", "Avanço de cerca", "Captação de água", "Plantio de exóticas",
    "Área sem edificações", "Área com vegetação nativa", "Outros",
  ];

  type FotoItem = { uri: string; legenda?: string };
  const usoFotoGroups: Record<string, FotoItem[]> = {};
  if (vistoria.fotos?.length) {
    for (const foto of vistoria.fotos) {
      const matchedTipo = USO_TIPOS.find(
        (t) => foto.legenda && foto.legenda.startsWith(t + " ") && /\d+$/.test(foto.legenda)
      );
      if (matchedTipo) {
        if (!usoFotoGroups[matchedTipo]) usoFotoGroups[matchedTipo] = [];
        usoFotoGroups[matchedTipo].push(foto);
      }
    }
  }

  const renderFoto = (foto: FotoItem, idx: number) => `
    <div class="foto-item">
      <img src="${foto.uri}" alt="Foto ${idx + 1}" />
      <p class="foto-legenda">${foto.legenda || `Registro Fotográfico ${idx + 1}`}</p>
    </div>`;

  const usosFotosHTML = (() => {
    const tiposComFoto = USO_TIPOS.filter((t) => usoFotoGroups[t]?.length);
    if (tiposComFoto.length === 0) return "";
    let html = `<div style="margin-top:16px;">`;
    let counter = 0;
    for (const tipo of tiposComFoto) {
      const group = usoFotoGroups[tipo];
      html += `<div style="margin:10px 0 6px;font-weight:700;font-size:10pt;color:#1a5276;border-bottom:1px solid #aed6f1;padding-bottom:3px;">${tipo} — ${group.length} foto${group.length > 1 ? "s" : ""}</div>`;
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
      html += group.map((f) => renderFoto(f, ++counter)).join("");
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  })();


  const croquiHTML = vistoria.croqui_imagem
    ? `<img src="${vistoria.croqui_imagem}" alt="Croqui" class="croqui-image" />`
    : `<p style="text-align: center; color: #666; padding: 40px;">Croqui não disponível</p>`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RO-NOT-ITU - ${vistoria.numero_notificacao || "Vistoria"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11pt;
      line-height: 1.4; 
      color: #000;
      padding: 20px;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #000;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      height: 60px;
      max-width: 180px;
      object-fit: contain;
    }
    .header-title {
      text-align: center;
      flex: 1;
      margin: 0 20px;
    }
    .header-title h1 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .header-title h2 {
      font-size: 12pt;
      font-weight: normal;
      color: #333;
    }
    .doc-code {
      font-size: 10pt;
      text-align: right;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-header {
      background: #002855;
      color: white;
      padding: 6px 12px;
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 0;
    }
    .section-content {
      border: 1px solid #ccc;
      border-top: none;
      padding: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 10px;
      text-align: left;
      font-size: 10pt;
    }
    th {
      background: #e8e8e8;
      font-weight: bold;
    }
    .field-row {
      display: flex;
      gap: 15px;
      margin-bottom: 8px;
    }
    .field {
      flex: 1;
    }
    .field-label {
      font-weight: bold;
      font-size: 9pt;
      color: #333;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 10pt;
      padding: 4px 0;
      border-bottom: 1px solid #ddd;
    }
    .croqui-section {
      text-align: center;
      padding: 15px;
    }
    .croqui-image {
      max-width: 100%;
      max-height: 300px;
      border: 1px solid #ccc;
    }
    .fotos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-top: 10px;
    }
    .foto-item {
      text-align: center;
    }
    .foto-item img {
      max-width: 100%;
      max-height: 180px;
      border: 1px solid #ccc;
    }
    .foto-legenda {
      font-size: 9pt;
      color: #333;
      margin-top: 5px;
      font-style: italic;
    }
    .signature-section {
      margin-top: 40px;
      display: flex;
      justify-content: space-around;
      padding-top: 30px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 9pt;
    }
    .signature-image {
      max-width: 180px;
      max-height: 60px;
      margin-bottom: 5px;
    }
    .signature-special {
      font-size: 9pt;
      font-weight: bold;
      padding: 6px 10px;
      border-radius: 4px;
      margin-bottom: 5px;
      display: inline-block;
    }
    .signature-refused {
      background-color: #FFF3CD;
      color: #92400E;
      border: 1px solid #F59E0B;
    }
    .signature-absent {
      background-color: #DBEAFE;
      color: #1E40AF;
      border: 1px solid #3B82F6;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 8pt;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    .obs-text {
      min-height: 40px;
      white-space: pre-wrap;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" class="logo" alt="CBA Logo" />` : `<div style="width: 150px;"></div>`}
    <div class="header-title">
      <h1>RELATÓRIO DE OCORRÊNCIA - NOTIFICAÇÃO</h1>
      <h2>${vistoria.projeto_nome || "EcoBrasil"}</h2>
    </div>
    ${ecoBrasilLogoBase64 ? `<img src="${ecoBrasilLogoBase64}" class="logo" alt="EcoBrasil Logo" style="height:52px;width:auto;object-fit:contain;" />` : `<div style="width: 150px;"></div>`}
  </div>

  <div class="section">
    <div class="section-header">01 – IDENTIFICAÇÃO PROPRIEDADE</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 15%;"><strong>Localização:</strong></td>
          <td style="width: 35%;">${vistoria.localizacao || "-"}</td>
          <td style="width: 15%;"><strong>Município:</strong></td>
          <td style="width: 20%;">${vistoria.municipio || "-"}</td>
          <td style="width: 7%;"><strong>UF:</strong></td>
          <td style="width: 8%;">${vistoria.uf || "SP"}</td>
        </tr>
        <tr>
          <td><strong>Setor:</strong></td>
          <td>${vistoria.setor || "-"}</td>
          <td><strong>Data:</strong></td>
          <td>${formatDate(vistoria.data_vistoria)}</td>
          <td><strong>Horário:</strong></td>
          <td>${vistoria.hora_vistoria || "-"}</td>
        </tr>
      </table>
    </div>
  </div>

  ${vistoria.weather_data ? `
  <div class="section">
    <div class="section-header">CONDIÇÕES CLIMÁTICAS NO MOMENTO DA VISTORIA</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 20%;"><strong>Temperatura:</strong></td>
          <td style="width: 13%;">${vistoria.weather_data.temperatura?.toFixed(1) || "-"}°C</td>
          <td style="width: 17%;"><strong>Umidade Relativa:</strong></td>
          <td style="width: 13%;">${vistoria.weather_data.umidade || "-"}%</td>
          <td style="width: 17%;"><strong>Nebulosidade:</strong></td>
          <td style="width: 20%;">${vistoria.weather_data.nebulosidade || "-"}%</td>
        </tr>
        <tr>
          <td><strong>Vento:</strong></td>
          <td>${vistoria.weather_data.velocidade_vento?.toFixed(1) || "-"} km/h</td>
          <td><strong>Direção:</strong></td>
          <td>${vistoria.weather_data.direcao_vento || "-"}</td>
          <td><strong>Condição:</strong></td>
          <td>${vistoria.weather_data.condicoes || "-"}</td>
        </tr>
      </table>
    </div>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-header">02 – IDENTIFICAÇÃO PROPRIETÁRIO</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 20%;"><strong>Proprietário/Caseiro:</strong></td>
          <td>${vistoria.proprietario || "-"}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-header">03 – USOS ENCONTRADOS</div>
    <div class="section-content">
      <table>
        <thead>
          <tr>
            <th>Tipo de Uso</th>
            <th style="width: 18%;">Quantidade</th>
            <th style="width: 12%;">Unidade</th>
            <th style="width: 22%;">Coordenada UTM</th>
          </tr>
        </thead>
        <tbody>
          ${usosSoloHTML}
        </tbody>
      </table>
      ${vistoria.observacoes_usos ? `<p style="margin-top: 10px;"><strong>Observação:</strong> ${vistoria.observacoes_usos}</p>` : ""}
      ${usosFotosHTML}
    </div>
  </div>

  <div class="section">
    <div class="section-header">CROQUI DA ÁREA (Coordenadas UTM - Zona ${vistoria.zona_utm || "23K"})</div>
    <div class="section-content">
      <div class="croqui-section">
        ${croquiHTML}
      </div>
      <table style="margin-top: 15px;">
        <thead>
          <tr>
            <th style="width: 15%;">Ponto</th>
            <th>E (Leste)</th>
            <th>N (Norte)</th>
          </tr>
        </thead>
        <tbody>
          ${coordenadasHTML}
        </tbody>
      </table>
    </div>
  </div>

  ${vistoria.ucInfo ? `
  <div class="section">
    <div class="section-header" style="background-color: ${vistoria.ucInfo.isInside ? '#c62828' : '#1565c0'};">
      ANÁLISE DE UNIDADES DE CONSERVAÇÃO - ${vistoria.ucInfo.isInside ? 'DENTRO DE UC' : 'UC MAIS PRÓXIMA'}
    </div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 30%;"><strong>UC Identificada:</strong></td>
          <td><strong>${vistoria.ucInfo.name || "-"}</strong></td>
          <td style="width: 20%;"><strong>Situação:</strong></td>
          <td style="color: ${vistoria.ucInfo.isInside ? '#c62828' : '#2e7d32'}; font-weight: bold;">
            ${vistoria.ucInfo.isInside ? 'DENTRO DA UC' : 'FORA DA UC'}
          </td>
        </tr>
        <tr>
          <td><strong>Categoria:</strong></td>
          <td>${vistoria.ucInfo.categoryName || vistoria.ucInfo.category || "-"}</td>
          <td><strong>Distância:</strong></td>
          <td>${vistoria.ucInfo.distanceKm != null ? `${vistoria.ucInfo.distanceKm.toFixed(2)} km` : "-"}</td>
        </tr>
        ${vistoria.ucInfo.biome ? `
        <tr>
          <td><strong>Bioma:</strong></td>
          <td>${vistoria.ucInfo.biome}</td>
          <td><strong>Estado:</strong></td>
          <td>${vistoria.ucInfo.state || "-"}</td>
        </tr>
        ` : ""}
        ${vistoria.ucInfo.areaKm2 ? `
        <tr>
          <td><strong>Área UC:</strong></td>
          <td>${vistoria.ucInfo.areaKm2.toFixed(2)} km²</td>
          <td><strong>Tipo de Restrição:</strong></td>
          <td>${vistoria.ucInfo.restrictionType || "-"}</td>
        </tr>
        ` : ""}
      </table>
    </div>
  </div>
  ` : ""}

  ${vistoria.carInfo ? `
  <div class="section">
    <div class="section-header">CADASTRO AMBIENTAL RURAL (CAR)</div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 20%;"><strong>Código CAR:</strong></td>
          <td>${vistoria.carInfo.codigo || "-"}</td>
          <td style="width: 15%;"><strong>Situação:</strong></td>
          <td>${vistoria.carInfo.situacao || "-"}</td>
        </tr>
        <tr>
          <td><strong>Município:</strong></td>
          <td>${vistoria.carInfo.municipio || "-"}</td>
          <td><strong>Área Total:</strong></td>
          <td>${vistoria.carInfo.area_total ? `${vistoria.carInfo.area_total.toFixed(2)} ha` : "-"}</td>
        </tr>
      </table>
    </div>
  </div>
  ` : ""}

  ${vistoria.embargoCheck ? `
  <div class="section">
    <div class="section-header" style="background-color: ${vistoria.embargoCheck.level === 'HIGH' ? '#c62828' : vistoria.embargoCheck.level === 'MEDIUM' ? '#f9a825' : '#2e7d32'};">
      ANÁLISE DE EMBARGO - RISCO ${vistoria.embargoCheck.level === 'HIGH' ? 'ALTO' : vistoria.embargoCheck.level === 'MEDIUM' ? 'MÉDIO' : 'BAIXO'}
    </div>
    <div class="section-content">
      <table>
        <tr>
          <td style="width: 30%;"><strong>Dentro de Área Protegida:</strong></td>
          <td>${vistoria.embargoCheck.isInsideProtectedArea ? 'SIM' : 'NÃO'}</td>
        </tr>
        ${vistoria.embargoCheck.protectedAreaName ? `
        <tr>
          <td><strong>Nome da Área:</strong></td>
          <td>${vistoria.embargoCheck.protectedAreaName}</td>
        </tr>
        ` : ""}
        ${vistoria.embargoCheck.protectionLevel ? `
        <tr>
          <td><strong>Nível de Proteção:</strong></td>
          <td>${vistoria.embargoCheck.protectionLevel}</td>
        </tr>
        ` : ""}
      </table>
      ${vistoria.embargoCheck.reasons && vistoria.embargoCheck.reasons.length > 0 ? `
      <p style="margin-top: 10px;"><strong>Motivos:</strong></p>
      <ul style="margin-left: 20px;">
        ${vistoria.embargoCheck.reasons.map(r => `<li>${r}</li>`).join('')}
      </ul>
      ` : ""}
      ${vistoria.embargoCheck.recommendations && vistoria.embargoCheck.recommendations.length > 0 ? `
      <p style="margin-top: 10px;"><strong>Recomendações:</strong></p>
      <ul style="margin-left: 20px;">
        ${vistoria.embargoCheck.recommendations.map(r => `<li>${r}</li>`).join('')}
      </ul>
      ` : ""}
    </div>
  </div>
  ` : ""}

  ${vistoria.tiInfo ? `
  <div class="section">
    <div class="section-header" style="background-color: ${vistoria.tiInfo.riskLevel === 'HIGH' ? '#c62828' : vistoria.tiInfo.riskLevel === 'MEDIUM' ? '#e65100' : '#2e7d32'};">
      TERRA INDÍGENA MAIS PRÓXIMA - RISCO ${vistoria.tiInfo.riskLevel === 'HIGH' ? 'ALTO' : vistoria.tiInfo.riskLevel === 'MEDIUM' ? 'MÉDIO' : 'BAIXO'} (${vistoria.tiInfo.distanceKm.toFixed(1)} km)
    </div>
    <div class="section-content">
      <table class="info-table" style="width: 100%;">
        <tr>
          <td class="label">Terra Indígena</td>
          <td><strong>${vistoria.tiInfo.nome}</strong></td>
        </tr>
        ${vistoria.tiInfo.etnia ? `
        <tr>
          <td class="label">Etnia</td>
          <td>${vistoria.tiInfo.etnia}</td>
        </tr>` : ""}
        ${vistoria.tiInfo.municipio || vistoria.tiInfo.uf ? `
        <tr>
          <td class="label">Localização</td>
          <td>${vistoria.tiInfo.municipio}${vistoria.tiInfo.municipio && vistoria.tiInfo.uf ? ' - ' : ''}${vistoria.tiInfo.uf}</td>
        </tr>` : ""}
        <tr>
          <td class="label">Distância</td>
          <td style="color: ${vistoria.tiInfo.riskLevel === 'HIGH' ? '#c62828' : vistoria.tiInfo.riskLevel === 'MEDIUM' ? '#e65100' : '#2e7d32'}; font-weight: bold;">
            ${vistoria.tiInfo.distanceKm.toFixed(2)} km ${vistoria.tiInfo.riskLevel === 'HIGH' ? '(ATENÇÃO: Proximidade crítica)' : vistoria.tiInfo.riskLevel === 'MEDIUM' ? '(Atenção recomendada)' : '(Distância segura)'}
          </td>
        </tr>
        ${vistoria.tiInfo.fase ? `
        <tr>
          <td class="label">Situação Fundiária</td>
          <td>${vistoria.tiInfo.fase}</td>
        </tr>` : ""}
      </table>
    </div>
  </div>
  ` : ""}

  ${vistoria.complianceAnalysis ? `
  <div class="section">
    <div class="section-header" style="background-color: ${vistoria.complianceAnalysis.conformidadeGeral === 'CONFORME' ? '#2e7d32' : vistoria.complianceAnalysis.conformidadeGeral === 'PARCIALMENTE_CONFORME' ? '#f9a825' : '#c62828'};">
      ANÁLISE DE CONFORMIDADE AMBIENTAL - ${vistoria.complianceAnalysis.conformidadeGeral === 'CONFORME' ? 'CONFORME' : vistoria.complianceAnalysis.conformidadeGeral === 'PARCIALMENTE_CONFORME' ? 'PARCIALMENTE CONFORME' : 'NÃO CONFORME'} (${vistoria.complianceAnalysis.pontuacao}%)
    </div>
    <div class="section-content">
      ${vistoria.complianceAnalysis.resumoExecutivo ? `
      <p style="margin-bottom: 15px;"><strong>Resumo Executivo:</strong> ${vistoria.complianceAnalysis.resumoExecutivo}</p>
      ` : ""}
      
      ${vistoria.complianceAnalysis.riscos && vistoria.complianceAnalysis.riscos.length > 0 ? `
      <p><strong>Riscos Identificados:</strong></p>
      <table style="margin-top: 10px;">
        <thead>
          <tr>
            <th style="width: 20%;">Nível</th>
            <th style="width: 25%;">Tipo</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          ${vistoria.complianceAnalysis.riscos.map(r => `
          <tr>
            <td style="text-align: center; background-color: ${r.nivel === 'CRITICO' || r.nivel === 'ALTO' ? '#ffebee' : r.nivel === 'MEDIO' ? '#fff8e1' : '#e8f5e9'};">
              <strong style="color: ${r.nivel === 'CRITICO' || r.nivel === 'ALTO' ? '#c62828' : r.nivel === 'MEDIO' ? '#f9a825' : '#2e7d32'};">${r.nivel}</strong>
            </td>
            <td>${r.tipo}</td>
            <td>${r.descricao}${r.fundamentacaoLegal ? ` <em>(${r.fundamentacaoLegal})</em>` : ''}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : ""}
      
      ${vistoria.complianceAnalysis.recomendacoes && vistoria.complianceAnalysis.recomendacoes.length > 0 ? `
      <p style="margin-top: 15px;"><strong>Recomendações:</strong></p>
      <ul style="margin-left: 20px;">
        ${vistoria.complianceAnalysis.recomendacoes.map(r => `<li>${r}</li>`).join('')}
      </ul>
      ` : ""}
    </div>
  </div>
  ` : ""}

  <div class="section">
    <div class="section-header">OBSERVAÇÕES GERAIS</div>
    <div class="section-content">
      <p class="obs-text">${vistoria.observacoes || "Sem observações adicionais."}</p>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      ${vistoria.assinatura_tecnico_uri
        ? `<img src="${vistoria.assinatura_tecnico_uri}" class="signature-image" alt="Assinatura Tecnico" />`
        : `<div style="margin-top: 60px;"></div>`}
      <div class="signature-line"></div>
      <div class="signature-label">Responsável Técnico</div>
    </div>
    <div class="signature-box">
      ${vistoria.assinatura_uri === "__recusou_assinar__"
        ? `<span class="signature-special signature-refused">Recusou-se a assinar</span>`
        : vistoria.assinatura_uri === "__ninguem_no_local__"
        ? `<span class="signature-special signature-absent">Ninguem no local</span>`
        : vistoria.assinatura_uri
        ? `<img src="${vistoria.assinatura_uri}" class="signature-image" alt="Assinatura" />`
        : `<div style="margin-top: 60px;"></div>`}
      <div class="signature-line"></div>
      <div class="signature-label">Proprietario / Caseiro</div>
    </div>
  </div>

  <div class="footer">
    <p>EcoBrasil Consultoria Ambiental - CBA</p>
    <p>Documento gerado pelo sistema MapeIA em ${new Date().toLocaleString("pt-BR")}</p>
  </div>
</body>
</html>
`;
}

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const vistoriaData: VistoriaData = req.body;

    if (!vistoriaData.proprietario) {
      return res.status(400).json({ error: "Dados da vistoria incompletos" });
    }

    const html = generatePDFHTML(vistoriaData);

    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="vistoria_${vistoriaData.id || "novo"}.html"`
    );
    res.send(html);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

router.get("/preview/:id", async (req: Request, res: Response) => {
  try {
    res.json({ message: "PDF preview endpoint", id: req.params.id });
  } catch (error) {
    console.error("Error getting PDF preview:", error);
    res.status(500).json({ error: "Erro ao buscar preview" });
  }
});

export default router;
