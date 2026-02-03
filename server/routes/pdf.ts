import { Router, Request, Response } from "express";

const router = Router();

interface VistoriaData {
  id: string;
  numero_notificacao?: string;
  setor?: string;
  margem?: string;
  municipio?: string;
  proprietario: string;
  loteamento_condominio?: string;
  tipo_inspecao: string;
  data_vistoria: string;
  zona_utm?: string;
  tipo_intervencao?: string;
  intervencao?: string;
  detalhamento_intervencao?: string;
  emissao_notificacao?: string;
  reincidente?: string;
  observacoes?: string;
  fotos?: Array<{ uri: string; legenda: string }>;
  coordenadas_utm?: Array<{ e: string; n: string }>;
  assinatura_uri?: string;
}

function generatePDFHTML(vistoria: VistoriaData): string {
  const fotosHTML = vistoria.fotos?.length
    ? vistoria.fotos
        .map(
          (foto, idx) => `
        <div class="foto-item">
          <img src="${foto.uri}" alt="Foto ${idx + 1}" />
          <p class="legenda">${foto.legenda || `Foto ${idx + 1}`}</p>
        </div>
      `
        )
        .join("")
    : "<p>Nenhuma foto registrada</p>";

  const coordenadasHTML = vistoria.coordenadas_utm?.length
    ? `<table class="coords-table">
        <thead><tr><th>Ponto</th><th>E (Leste)</th><th>N (Norte)</th></tr></thead>
        <tbody>
          ${vistoria.coordenadas_utm
            .map(
              (coord, idx) =>
                `<tr><td>${idx + 1}</td><td>${coord.e}</td><td>${coord.n}</td></tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : "<p>Nenhuma coordenada registrada</p>";

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Vistoria - ${vistoria.proprietario}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1E3A5F;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1E3A5F;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
    }
    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .section-title {
      background: #1E3A5F;
      color: white;
      padding: 8px 15px;
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .field {
      margin-bottom: 10px;
    }
    .field-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .field-value {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      padding: 5px 0;
      border-bottom: 1px solid #ddd;
    }
    .full-width { grid-column: span 2; }
    .coords-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .coords-table th, .coords-table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: center;
    }
    .coords-table th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .fotos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .foto-item {
      text-align: center;
    }
    .foto-item img {
      max-width: 100%;
      max-height: 200px;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .legenda {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }
    .signature-line {
      border-top: 1px solid #333;
      width: 300px;
      margin: 50px auto 10px;
    }
    .signature-label {
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>RELATÓRIO DE VISTORIA AMBIENTAL</h1>
    <p class="subtitle">UHE Itupararanga - Cadastramento de Propriedade</p>
  </div>

  <div class="section">
    <div class="section-title">IDENTIFICAÇÃO</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Nº Notificação</div>
        <div class="field-value">${vistoria.numero_notificacao || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Setor</div>
        <div class="field-value">${vistoria.setor || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Margem</div>
        <div class="field-value">${vistoria.margem || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Município</div>
        <div class="field-value">${vistoria.municipio || "-"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">PROPRIETÁRIO</div>
    <div class="field-grid">
      <div class="field full-width">
        <div class="field-label">Nome do Proprietário</div>
        <div class="field-value">${vistoria.proprietario}</div>
      </div>
      <div class="field full-width">
        <div class="field-label">Loteamento / Condomínio</div>
        <div class="field-value">${vistoria.loteamento_condominio || "-"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">INSPEÇÃO</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Tipo de Inspeção</div>
        <div class="field-value">${vistoria.tipo_inspecao}</div>
      </div>
      <div class="field">
        <div class="field-label">Data da Vistoria</div>
        <div class="field-value">${vistoria.data_vistoria}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">COORDENADAS UTM (Zona ${vistoria.zona_utm || "23K"})</div>
    ${coordenadasHTML}
  </div>

  <div class="section">
    <div class="section-title">INTERVENÇÃO</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Tipo de Intervenção</div>
        <div class="field-value">${vistoria.tipo_intervencao || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Intervenção</div>
        <div class="field-value">${vistoria.intervencao || "-"}</div>
      </div>
      <div class="field full-width">
        <div class="field-label">Detalhamento</div>
        <div class="field-value">${vistoria.detalhamento_intervencao || "-"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">NOTIFICAÇÃO</div>
    <div class="field-grid">
      <div class="field">
        <div class="field-label">Emissão de Notificação</div>
        <div class="field-value">${vistoria.emissao_notificacao || "-"}</div>
      </div>
      <div class="field">
        <div class="field-label">Reincidente</div>
        <div class="field-value">${vistoria.reincidente || "-"}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">OBSERVAÇÕES</div>
    <div class="field full-width">
      <div class="field-value" style="min-height: 60px;">${vistoria.observacoes || "-"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">REGISTRO FOTOGRÁFICO</div>
    <div class="fotos-grid">
      ${fotosHTML}
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-line"></div>
    <p class="signature-label">Assinatura do Responsável Técnico</p>
  </div>

  <div class="footer">
    <p>Documento gerado automaticamente pelo sistema MapeIA</p>
    <p>Data de geração: ${new Date().toLocaleString("pt-BR")}</p>
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
