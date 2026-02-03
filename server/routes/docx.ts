import { Router, Request, Response } from "express";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  ImageRun,
  Header,
  Footer,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const router = Router();

interface UsoSolo {
  tipo: string;
  valor: string;
  unidade: string;
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
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function createSectionHeader(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text,
        bold: true,
        color: "FFFFFF",
        size: 22,
      }),
    ],
    shading: {
      fill: "002855",
    },
    spacing: { before: 200, after: 100 },
    alignment: AlignmentType.LEFT,
  });
}

function createFieldRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 20 })],
          }),
        ],
        shading: { fill: "E8E8E8" },
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value || "-", size: 20 })],
          }),
        ],
      }),
    ],
  });
}

async function generateWordDocument(vistoria: VistoriaData): Promise<Buffer> {
  const sections: any[] = [];

  // Try to load CBA logo
  let logoImage: ImageRun | null = null;
  try {
    const logoPath = path.join(__dirname, "../assets/cba_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoImage = new ImageRun({
        data: logoBuffer,
        transformation: {
          width: 150,
          height: 50,
        },
        type: "png",
      });
    }
  } catch (error) {
    console.error("Error loading logo:", error);
  }

  // Header paragraphs
  const headerParagraphs: Paragraph[] = [];
  
  if (logoImage) {
    headerParagraphs.push(
      new Paragraph({
        children: [logoImage],
        alignment: AlignmentType.LEFT,
      })
    );
  }

  headerParagraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "RELATÓRIO DE OCORRÊNCIA - NOTIFICAÇÃO",
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "UHE Itupararanga",
          size: 24,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: vistoria.numero_notificacao || "-",
          bold: true,
          size: 22,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
    })
  );

  // 01 – IDENTIFICAÇÃO PROPRIEDADE
  sections.push(
    createSectionHeader("01 – IDENTIFICAÇÃO PROPRIEDADE"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Localização:", bold: true, size: 20 })],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: vistoria.localizacao || "-", size: 20 })],
                }),
              ],
              width: { size: 35, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Município:", bold: true, size: 20 })],
                }),
              ],
              width: { size: 15, type: WidthType.PERCENTAGE },
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: vistoria.municipio || "-", size: 20 })],
                }),
              ],
              width: { size: 20, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "UF:", bold: true, size: 20 })],
                }),
              ],
              width: { size: 7, type: WidthType.PERCENTAGE },
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: vistoria.uf || "SP", size: 20 })],
                }),
              ],
              width: { size: 8, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Setor:", bold: true, size: 20 })],
                }),
              ],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: vistoria.setor || "-", size: 20 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Data:", bold: true, size: 20 })],
                }),
              ],
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: formatDate(vistoria.data_vistoria), size: 20 })],
                }),
              ],
            }),
            new TableCell({
              children: [new Paragraph({ children: [] })],
              columnSpan: 2,
            }),
          ],
        }),
      ],
    })
  );

  // 02 – IDENTIFICAÇÃO PROPRIETÁRIO
  sections.push(
    createSectionHeader("02 – IDENTIFICAÇÃO PROPRIETÁRIO"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "Proprietário/Caseiro:", bold: true, size: 20 })],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: "E8E8E8" },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: vistoria.proprietario || "-", size: 20 })],
                }),
              ],
              width: { size: 75, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
      ],
    })
  );

  // 03 – USOS ENCONTRADOS
  const usosRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Tipo de Uso", bold: true, size: 20 })],
            }),
          ],
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Quantidade", bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E8E8E8" },
          width: { size: 20, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Unidade", bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E8E8E8" },
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ],
    }),
  ];

  if (vistoria.usos_solo && vistoria.usos_solo.length > 0) {
    vistoria.usos_solo.forEach((uso) => {
      usosRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: uso.tipo, size: 20 })],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: uso.valor || "-", size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: uso.unidade || "", size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
      );
    });
  } else {
    usosRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Nenhum uso identificado", size: 20 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 3,
          }),
        ],
      })
    );
  }

  sections.push(
    createSectionHeader("03 – USOS ENCONTRADOS"),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: usosRows,
    })
  );

  if (vistoria.observacoes_usos) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Observação: ", bold: true, size: 20 }),
          new TextRun({ text: vistoria.observacoes_usos, size: 20 }),
        ],
        spacing: { before: 100, after: 200 },
      })
    );
  }

  // CROQUI DA ÁREA
  sections.push(
    createSectionHeader(`CROQUI DA ÁREA (Coordenadas UTM - Zona ${vistoria.zona_utm || "23K"})`),
    new Paragraph({
      children: [
        new TextRun({
          text: vistoria.croqui_imagem
            ? "[Croqui do mapa incluído no documento PDF]"
            : "Croqui não disponível",
          size: 20,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    })
  );

  // Coordinates table
  const coordRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "Ponto", bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E8E8E8" },
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "E (Leste)", bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E8E8E8" },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: "N (Norte)", bold: true, size: 20 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "E8E8E8" },
        }),
      ],
    }),
  ];

  if (vistoria.coordenadas_utm && vistoria.coordenadas_utm.length > 0) {
    vistoria.coordenadas_utm.forEach((coord, idx) => {
      coordRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(idx + 1), size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: coord.e, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: coord.n, size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        })
      );
    });
  } else {
    coordRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "-", size: 20 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 3,
          }),
        ],
      })
    );
  }

  sections.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: coordRows,
    })
  );

  // OBSERVAÇÕES GERAIS
  sections.push(
    createSectionHeader("OBSERVAÇÕES GERAIS"),
    new Paragraph({
      children: [
        new TextRun({
          text: vistoria.observacoes || "Sem observações adicionais.",
          size: 20,
        }),
      ],
      spacing: { before: 100, after: 200 },
    })
  );

  // REGISTROS FOTOGRÁFICOS
  sections.push(
    createSectionHeader("REGISTROS FOTOGRÁFICOS"),
    new Paragraph({
      children: [
        new TextRun({
          text: vistoria.fotos && vistoria.fotos.length > 0
            ? `${vistoria.fotos.length} registro(s) fotográfico(s) incluído(s) no documento PDF.`
            : "Nenhum registro fotográfico disponível.",
          size: 20,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 },
    })
  );

  // Signature section
  sections.push(
    new Paragraph({
      children: [],
      spacing: { before: 600 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "_________________________", size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: "Responsável Técnico", size: 18 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: "_________________________", size: 20 })],
                  alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                  children: [new TextRun({ text: "Proprietário / Caseiro", size: 18 })],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            }),
          ],
        }),
      ],
    })
  );

  // Footer
  sections.push(
    new Paragraph({
      children: [],
      spacing: { before: 400 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "EcoBrasil Consultoria Ambiental - CBA",
          size: 16,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Documento gerado pelo sistema MapeIA em ${new Date().toLocaleString("pt-BR")}`,
          size: 16,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [...headerParagraphs, ...sections],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

router.post("/generate", async (req: Request, res: Response) => {
  try {
    const vistoriaData: VistoriaData = req.body;

    if (!vistoriaData.proprietario) {
      return res.status(400).json({ error: "Dados da vistoria incompletos" });
    }

    const buffer = await generateWordDocument(vistoriaData);
    const filename = `RO-NOT-ITU_${vistoriaData.numero_notificacao?.replace(/[^a-zA-Z0-9]/g, "_") || vistoriaData.id || "novo"}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating Word document:", error);
    res.status(500).json({ error: "Erro ao gerar documento Word" });
  }
});

export default router;
