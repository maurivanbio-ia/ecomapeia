import { Router, Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { db } from "../db";
import { complexos, projetos, vistorias } from "../../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { COMPLEXOS_DATA } from "../mem-storage";

const DATABASE_URL = process.env.DATABASE_URL;

const router = Router();

function getCBALogoBase64(): string {
  try {
    const logoPath = path.join(__dirname, "../assets/cba_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch (error) {
    console.error("Error loading CBA logo:", error);
  }
  return "";
}

function getEcoBrasilLogoBase64(): string {
  try {
    const logoPath = path.join(__dirname, "../assets/ecobrasil_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }
  } catch (error) {
    console.error("Error loading EcoBrasil logo:", error);
  }
  return "";
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr as any);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString("pt-BR");
}

function nowFormatted(): string {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UHERow {
  id: number;
  nome: string;
  codigo: string | null;
  reservatorio: string | null;
  municipios: string | null;
}

interface ComplexoData {
  id: number;
  nome: string;
  uhes: UHERow[];
  vistoriasList: any[];
}

function generateReportHTML(title: string, subtitle: string, data: ComplexoData[]): string {
  const cbaLogo = getCBALogoBase64();
  const ecoLogo = getEcoBrasilLogoBase64();
  const geradoEm = nowFormatted();

  const totalVistorias = data.reduce((acc, c) => acc + c.vistoriasList.length, 0);
  const totalUhes = data.reduce((acc, c) => acc + c.uhes.length, 0);

  const complexosHTML = data.map((complexo) => {
    if (complexo.vistoriasList.length === 0) {
      return `
        <div class="complexo-block">
          <div class="complexo-header">
            <span class="complexo-name">${complexo.nome}</span>
            <span class="complexo-badge">${complexo.uhes.length} UHE(s) &mdash; 0 vistorias</span>
          </div>
          <p class="no-data">Nenhuma vistoria registrada para este complexo.</p>
        </div>
      `;
    }

    const uheMap = new Map<number | null, { nome: string; vistorias: any[] }>();
    uheMap.set(null, { nome: "Sem UHE vinculada", vistorias: [] });
    complexo.uhes.forEach((u) => uheMap.set(u.id, { nome: u.nome, vistorias: [] }));

    complexo.vistoriasList.forEach((v) => {
      const key = v.projeto_id ?? null;
      if (uheMap.has(key)) {
        uheMap.get(key)!.vistorias.push(v);
      } else {
        uheMap.get(null)!.vistorias.push(v);
      }
    });

    const uheBlocksHTML = Array.from(uheMap.entries())
      .filter(([, val]) => val.vistorias.length > 0)
      .map(([, uheData]) => {
        const rows = uheData.vistorias.map((v, idx) => `
          <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
            <td>${idx + 1}</td>
            <td>${v.numero_notificacao || "-"}</td>
            <td>${v.proprietario || "-"}</td>
            <td>${v.municipio || "-"}</td>
            <td>${v.tipo_inspecao || "-"}</td>
            <td>${v.tipo_intervencao || "-"}</td>
            <td>${formatDate(v.data_vistoria)}</td>
            <td class="status-cell ${v.status_upload === "synced" ? "status-sync" : "status-pending"}">${v.status_upload === "synced" ? "Sincronizado" : "Pendente"}</td>
          </tr>
        `).join("");

        return `
          <div class="uhe-block">
            <div class="uhe-header">
              <span class="uhe-icon">&#9889;</span>
              <span class="uhe-name">${uheData.nome}</span>
              <span class="uhe-count">${uheData.vistorias.length} vistoria(s)</span>
            </div>
            <table class="vistoria-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>N. Notificacao</th>
                  <th>Proprietario</th>
                  <th>Municipio</th>
                  <th>Tipo</th>
                  <th>Intervencao</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }).join("");

    return `
      <div class="complexo-block">
        <div class="complexo-header">
          <span class="complexo-name">${complexo.nome}</span>
          <span class="complexo-badge">${complexo.uhes.length} UHE(s) &mdash; ${complexo.vistoriasList.length} vistoria(s)</span>
        </div>
        ${uheBlocksHTML}
      </div>
    `;
  }).join("");

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      font-size: 10pt;
      color: #1a1a1a;
      background: #fff;
    }
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 24px 14px 24px;
      border-bottom: 3px solid #1a5c38;
      background: #f8fdf9;
    }
    .logo-wrap img { height: 56px; object-fit: contain; }
    .logo-wrap .no-logo {
      font-size: 20pt;
      font-weight: 900;
      color: #1a5c38;
      letter-spacing: -1px;
    }
    .header-center { flex: 1; text-align: center; padding: 0 16px; }
    .header-center h1 {
      font-size: 14pt;
      font-weight: 700;
      color: #1a5c38;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-center h2 {
      font-size: 10pt;
      font-weight: 400;
      color: #444;
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 8pt;
      color: #666;
      min-width: 120px;
    }
    .summary-bar {
      display: flex;
      gap: 0;
      background: #1a5c38;
      color: #fff;
      padding: 10px 24px;
    }
    .summary-item {
      flex: 1;
      text-align: center;
      border-right: 1px solid rgba(255,255,255,0.3);
      padding: 4px 0;
    }
    .summary-item:last-child { border-right: none; }
    .summary-value { font-size: 18pt; font-weight: 700; line-height: 1.1; }
    .summary-label { font-size: 7.5pt; text-transform: uppercase; opacity: 0.85; letter-spacing: 0.5px; }
    .content { padding: 18px 24px; }
    .complexo-block {
      margin-bottom: 24px;
      border: 1px solid #d1e8da;
      border-radius: 6px;
      overflow: hidden;
    }
    .complexo-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #e8f5ed;
      padding: 9px 14px;
      border-bottom: 1px solid #c3dece;
    }
    .complexo-name {
      font-size: 11pt;
      font-weight: 700;
      color: #1a5c38;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .complexo-badge {
      font-size: 8pt;
      color: #2d7a50;
      background: #d0edda;
      padding: 2px 10px;
      border-radius: 10px;
    }
    .no-data {
      padding: 14px;
      text-align: center;
      color: #888;
      font-style: italic;
      font-size: 9pt;
    }
    .uhe-block { padding: 0 14px 14px 14px; margin-top: 12px; }
    .uhe-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 7px;
    }
    .uhe-icon { color: #F59E0B; font-size: 13pt; }
    .uhe-name { font-size: 10pt; font-weight: 700; color: #333; flex: 1; }
    .uhe-count {
      font-size: 8pt;
      color: #888;
      background: #f0f0f0;
      padding: 1px 8px;
      border-radius: 8px;
    }
    .vistoria-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    .vistoria-table th {
      background: #2d7a50;
      color: #fff;
      padding: 5px 6px;
      text-align: left;
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .vistoria-table td {
      padding: 5px 6px;
      border-bottom: 1px solid #eee;
      vertical-align: middle;
      word-break: break-word;
      max-width: 120px;
    }
    .row-even td { background: #fff; }
    .row-odd td { background: #f7fbf8; }
    .status-cell { font-weight: 600; font-size: 7.5pt; }
    .status-sync { color: #16a34a; }
    .status-pending { color: #d97706; }
    .page-footer {
      margin-top: 24px;
      padding: 12px 24px;
      border-top: 2px solid #1a5c38;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #666;
      background: #f8fdf9;
    }
    @media print {
      .complexo-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div class="logo-wrap">
      <div style="display:flex;align-items:center;gap:12px;">
        ${cbaLogo ? `<img src="${cbaLogo}" alt="CBA Logo" style="height:50px;object-fit:contain;" />` : `<div class="no-logo">CBA</div>`}
        ${ecoLogo ? `<img src="${ecoLogo}" alt="EcoBrasil Logo" style="height:44px;object-fit:contain;" />` : `<div class="no-logo" style="color:#27ae60;">EcoBrasil</div>`}
      </div>
    </div>
    <div class="header-center">
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
    </div>
    <div class="header-right">
      Gerado em:<br/><strong>${geradoEm}</strong><br/>
      EcoBrasil Consultoria
    </div>
  </div>

  <div class="summary-bar">
    <div class="summary-item">
      <div class="summary-value">${data.length}</div>
      <div class="summary-label">Complexo(s)</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${totalUhes}</div>
      <div class="summary-label">UHE(s)</div>
    </div>
    <div class="summary-item">
      <div class="summary-value">${totalVistorias}</div>
      <div class="summary-label">Vistoria(s)</div>
    </div>
  </div>

  <div class="content">
    ${complexosHTML}
  </div>

  <div class="page-footer">
    <span>CBA &mdash; Companhia Brasileira de Aluminio &mdash; Levantamento Fundiario</span>
    <span>EcoBrasil Consultoria Ambiental &mdash; ${geradoEm}</span>
  </div>
</body>
</html>
  `;
}

// Helper: send HTML either as download or inline
function sendReport(req: Request, res: Response, html: string, filename: string) {
  const forceDownload = req.query.download === "1";
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (forceDownload) {
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.html"`);
  }
  res.send(html);
}

router.get("/all", async (req: Request, res: Response) => {
  try {
    let data: ComplexoData[];

    if (!DATABASE_URL) {
      // MemStorage fallback: use static data
      data = COMPLEXOS_DATA.map((c) => ({
        id: c.id,
        nome: c.nome,
        uhes: c.uhes as UHERow[],
        vistoriasList: [],
      }));
    } else {
      const allComplexos = await db.select().from(complexos).where(eq(complexos.ativo, true)).orderBy(complexos.nome);
      data = await Promise.all(
        allComplexos.map(async (c) => {
          const uhes = await db.select().from(projetos).where(and(eq(projetos.complexo_id, c.id), eq(projetos.ativo, true)));
          const uheIds = uhes.map((u) => u.id);
          const vistoriasList =
            uheIds.length > 0
              ? await db.select().from(vistorias).where(inArray(vistorias.projeto_id, uheIds)).orderBy(sql`data_vistoria DESC`)
              : [];
          return { id: c.id, nome: c.nome, uhes, vistoriasList };
        })
      );
    }

    const html = generateReportHTML(
      "Relatório de Levantamento Fundiário",
      "Todos os Complexos Hidrelétricos CBA",
      data
    );
    sendReport(req, res, html, `relatorio_geral_${new Date().toISOString().slice(0,10)}`);
  } catch (error) {
    console.error("Error generating full report:", error);
    res.status(500).json({ error: "Erro ao gerar relatório" });
  }
});

router.get("/complexo/:complexoId", async (req: Request, res: Response) => {
  try {
    const complexoId = parseInt(req.params.complexoId as string);
    let data: ComplexoData[];

    if (!DATABASE_URL) {
      const found = COMPLEXOS_DATA.find((c) => c.id === complexoId);
      if (!found) return res.status(404).json({ error: "Complexo não encontrado" });
      data = [{ id: found.id, nome: found.nome, uhes: found.uhes as UHERow[], vistoriasList: [] }];
    } else {
      const [complexo] = await db.select().from(complexos).where(eq(complexos.id, complexoId));
      if (!complexo) return res.status(404).json({ error: "Complexo não encontrado" });
      const uhes = await db.select().from(projetos).where(and(eq(projetos.complexo_id, complexoId), eq(projetos.ativo, true)));
      const uheIds = uhes.map((u) => u.id);
      const vistoriasList =
        uheIds.length > 0
          ? await db.select().from(vistorias).where(inArray(vistorias.projeto_id, uheIds)).orderBy(sql`data_vistoria DESC`)
          : [];
      data = [{ id: complexo.id, nome: complexo.nome, uhes, vistoriasList }];
    }

    const html = generateReportHTML(
      "Relatório de Levantamento Fundiário",
      `Complexo: ${data[0].nome}`,
      data
    );
    sendReport(req, res, html, `relatorio_${data[0].nome.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}`);
  } catch (error) {
    console.error("Error generating complexo report:", error);
    res.status(500).json({ error: "Erro ao gerar relatório do complexo" });
  }
});

router.get("/uhe/:uheId", async (req: Request, res: Response) => {
  try {
    const uheId = parseInt(req.params.uheId as string);
    let data: ComplexoData[];
    let uheName = "";

    if (!DATABASE_URL) {
      let foundUhe: any = null;
      let foundComplexo: any = null;
      for (const c of COMPLEXOS_DATA) {
        const u = c.uhes.find((u) => u.id === uheId);
        if (u) { foundUhe = u; foundComplexo = c; break; }
      }
      if (!foundUhe) return res.status(404).json({ error: "UHE não encontrada" });
      uheName = foundUhe.nome;
      data = [{ id: foundComplexo.id, nome: foundComplexo.nome, uhes: [foundUhe as UHERow], vistoriasList: [] }];
    } else {
      const [uhe] = await db.select().from(projetos).where(eq(projetos.id, uheId));
      if (!uhe) return res.status(404).json({ error: "UHE não encontrada" });
      uheName = uhe.nome;
      const [complexo] = uhe.complexo_id
        ? await db.select().from(complexos).where(eq(complexos.id, uhe.complexo_id))
        : [{ id: 0, nome: "Sem complexo" }];
      const vistoriasList = await db
        .select()
        .from(vistorias)
        .where(eq(vistorias.projeto_id, uheId))
        .orderBy(sql`data_vistoria DESC`);
      data = [{ id: complexo?.id ?? 0, nome: complexo?.nome ?? "Sem complexo", uhes: [uhe as UHERow], vistoriasList }];
    }

    const html = generateReportHTML(
      "Relatório de Levantamento Fundiário",
      `UHE/PCH: ${uheName}`,
      data
    );
    sendReport(req, res, html, `relatorio_${uheName.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}`);
  } catch (error) {
    console.error("Error generating UHE report:", error);
    res.status(500).json({ error: "Erro ao gerar relatório da UHE" });
  }
});

export default router;
