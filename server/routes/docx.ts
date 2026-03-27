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
  ImageRun,
  PageBreak,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const router = Router();

interface UsoSolo {
  tipo: string;
  valor: string;
  unidade: string;
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
  embargoCheck?: EmbargoCheck;
  complianceAnalysis?: ComplianceAnalysis;
  carInfo?: CARInfo;
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
    spacing: { before: 300, after: 100 },
    alignment: AlignmentType.LEFT,
  });
}

function createColoredSectionHeader(text: string, color: string): Paragraph {
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
      fill: color,
    },
    spacing: { before: 300, after: 100 },
    alignment: AlignmentType.LEFT,
  });
}

function base64ToBuffer(base64String: string): Buffer | null {
  try {
    const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    if (matches && matches[2]) {
      return Buffer.from(matches[2], "base64");
    }
    return null;
  } catch {
    return null;
  }
}

async function generateWordDocument(vistoria: VistoriaData): Promise<Buffer> {
  const sections: any[] = [];

  let logoImage: ImageRun | null = null;
  try {
    const logoPath = path.join(__dirname, "../assets/cba_logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoImage = new ImageRun({
        data: logoBuffer,
        transformation: {
          width: 180,
          height: 60,
        },
        type: "png",
      });
    }
  } catch (error) {
    console.error("Error loading logo:", error);
  }

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
      spacing: { after: 300 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" },
      },
    })
  );

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

  sections.push(
    createSectionHeader(`CROQUI DA ÁREA (Coordenadas UTM - Zona ${vistoria.zona_utm || "23K"})`)
  );

  if (vistoria.croqui_imagem) {
    const croquiBuffer = base64ToBuffer(vistoria.croqui_imagem);
    if (croquiBuffer) {
      try {
        const croquiImage = new ImageRun({
          data: croquiBuffer,
          transformation: {
            width: 450,
            height: 280,
          },
          type: "png",
        });
        sections.push(
          new Paragraph({
            children: [croquiImage],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          })
        );
      } catch {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: "Croqui disponível no documento PDF", size: 20, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          })
        );
      }
    } else {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Croqui disponível no documento PDF", size: 20, italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
        })
      );
    }
  } else {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Croqui não disponível", size: 20, italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      })
    );
  }

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

  // CAR Section
  if (vistoria.carInfo) {
    sections.push(
      createSectionHeader("CADASTRO AMBIENTAL RURAL (CAR)"),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Código CAR:", bold: true, size: 20 })] })],
                width: { size: 20, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: vistoria.carInfo.codigo || "-", size: 20 })] })],
                width: { size: 30, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Situação:", bold: true, size: 20 })] })],
                width: { size: 15, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: vistoria.carInfo.situacao || "-", size: 20 })] })],
                width: { size: 35, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Município:", bold: true, size: 20 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: vistoria.carInfo.municipio || "-", size: 20 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Área Total:", bold: true, size: 20 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: vistoria.carInfo.area_total ? `${vistoria.carInfo.area_total.toFixed(2)} ha` : "-", size: 20 })] })],
              }),
            ],
          }),
        ],
      })
    );
  }

  // Embargo Section
  if (vistoria.embargoCheck) {
    const embargoColor = vistoria.embargoCheck.level === 'HIGH' ? 'C62828' : vistoria.embargoCheck.level === 'MEDIUM' ? 'F9A825' : '2E7D32';
    const embargoLabel = vistoria.embargoCheck.level === 'HIGH' ? 'ALTO' : vistoria.embargoCheck.level === 'MEDIUM' ? 'MÉDIO' : 'BAIXO';
    
    sections.push(
      createColoredSectionHeader(`ANÁLISE DE EMBARGO - RISCO ${embargoLabel}`, embargoColor),
      new Paragraph({
        children: [
          new TextRun({ text: "Dentro de Área Protegida: ", bold: true, size: 20 }),
          new TextRun({ text: vistoria.embargoCheck.isInsideProtectedArea ? "SIM" : "NÃO", size: 20 }),
        ],
        spacing: { after: 100 },
      })
    );
    
    if (vistoria.embargoCheck.protectedAreaName) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Nome da Área: ", bold: true, size: 20 }),
            new TextRun({ text: vistoria.embargoCheck.protectedAreaName, size: 20 }),
          ],
          spacing: { after: 100 },
        })
      );
    }
    
    if (vistoria.embargoCheck.reasons && vistoria.embargoCheck.reasons.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Motivos:", bold: true, size: 20 })],
          spacing: { before: 100 },
        })
      );
      vistoria.embargoCheck.reasons.forEach(reason => {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${reason}`, size: 20 })],
            indent: { left: 360 },
          })
        );
      });
    }
    
    if (vistoria.embargoCheck.recommendations && vistoria.embargoCheck.recommendations.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Recomendações:", bold: true, size: 20 })],
          spacing: { before: 100 },
        })
      );
      vistoria.embargoCheck.recommendations.forEach(rec => {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${rec}`, size: 20 })],
            indent: { left: 360 },
          })
        );
      });
    }
  }

  // Compliance Analysis Section
  if (vistoria.complianceAnalysis) {
    const complianceColor = vistoria.complianceAnalysis.conformidadeGeral === 'CONFORME' ? '2E7D32' : vistoria.complianceAnalysis.conformidadeGeral === 'PARCIALMENTE_CONFORME' ? 'F9A825' : 'C62828';
    const complianceLabel = vistoria.complianceAnalysis.conformidadeGeral === 'CONFORME' ? 'CONFORME' : vistoria.complianceAnalysis.conformidadeGeral === 'PARCIALMENTE_CONFORME' ? 'PARCIALMENTE CONFORME' : 'NÃO CONFORME';
    
    sections.push(
      createColoredSectionHeader(`ANÁLISE DE CONFORMIDADE AMBIENTAL - ${complianceLabel} (${vistoria.complianceAnalysis.pontuacao}%)`, complianceColor)
    );
    
    if (vistoria.complianceAnalysis.resumoExecutivo) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Resumo Executivo: ", bold: true, size: 20 }),
            new TextRun({ text: vistoria.complianceAnalysis.resumoExecutivo, size: 20 }),
          ],
          spacing: { after: 200 },
        })
      );
    }
    
    if (vistoria.complianceAnalysis.riscos && vistoria.complianceAnalysis.riscos.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Riscos Identificados:", bold: true, size: 20 })],
          spacing: { before: 100 },
        })
      );
      
      const riskRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Nível", bold: true, size: 18 })], alignment: AlignmentType.CENTER })],
              shading: { fill: "002855" },
              width: { size: 15, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Tipo", bold: true, size: 18, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
              shading: { fill: "002855" },
              width: { size: 25, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: "Descrição", bold: true, size: 18, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
              shading: { fill: "002855" },
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        ...vistoria.complianceAnalysis.riscos.map(risk => 
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ 
                  children: [new TextRun({ 
                    text: risk.nivel, 
                    bold: true, 
                    size: 18,
                    color: risk.nivel === 'CRITICO' || risk.nivel === 'ALTO' ? 'C62828' : risk.nivel === 'MEDIO' ? 'F9A825' : '2E7D32'
                  })], 
                  alignment: AlignmentType.CENTER 
                })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: risk.tipo, size: 18 })] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `${risk.descricao}${risk.fundamentacaoLegal ? ` (${risk.fundamentacaoLegal})` : ''}`, size: 18 })] })],
              }),
            ],
          })
        ),
      ];
      
      sections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: riskRows,
        })
      );
    }
    
    if (vistoria.complianceAnalysis.recomendacoes && vistoria.complianceAnalysis.recomendacoes.length > 0) {
      sections.push(
        new Paragraph({
          children: [new TextRun({ text: "Recomendações:", bold: true, size: 20 })],
          spacing: { before: 200 },
        })
      );
      vistoria.complianceAnalysis.recomendacoes.forEach(rec => {
        sections.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${rec}`, size: 20 })],
            indent: { left: 360 },
          })
        );
      });
    }
  }

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

  sections.push(
    createSectionHeader("REGISTROS FOTOGRÁFICOS")
  );

  if (vistoria.fotos && vistoria.fotos.length > 0) {
    for (let i = 0; i < vistoria.fotos.length; i += 2) {
      const fotosRow: TableCell[] = [];
      
      for (let j = 0; j < 2; j++) {
        const fotoIndex = i + j;
        if (fotoIndex < vistoria.fotos.length) {
          const foto = vistoria.fotos[fotoIndex];
          const fotoBuffer = base64ToBuffer(foto.uri);
          
          if (fotoBuffer) {
            try {
              const fotoImage = new ImageRun({
                data: fotoBuffer,
                transformation: {
                  width: 220,
                  height: 165,
                },
                type: "png",
              });
              
              fotosRow.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [fotoImage],
                      alignment: AlignmentType.CENTER,
                      spacing: { after: 50 },
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: foto.legenda || `Foto ${fotoIndex + 1}`,
                          size: 18,
                          italics: true,
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                })
              );
            } catch {
              fotosRow.push(
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `[${foto.legenda || `Foto ${fotoIndex + 1}`}]`,
                          size: 18,
                          italics: true,
                        }),
                      ],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: {
                    top: { style: BorderStyle.NONE },
                    bottom: { style: BorderStyle.NONE },
                    left: { style: BorderStyle.NONE },
                    right: { style: BorderStyle.NONE },
                  },
                })
              );
            }
          } else {
            fotosRow.push(
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `[${foto.legenda || `Foto ${fotoIndex + 1}`}]`,
                        size: 18,
                        italics: true,
                      }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              })
            );
          }
        } else {
          fotosRow.push(
            new TableCell({
              children: [new Paragraph({ children: [] })],
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
            })
          );
        }
      }

      sections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({ children: fotosRow })],
        }),
        new Paragraph({ children: [], spacing: { after: 150 } })
      );
    }
  } else {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Nenhum registro fotográfico disponível.",
            size: 20,
            italics: true,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      })
    );
  }

  sections.push(
    new Paragraph({ children: [], spacing: { before: 400 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({ children: [], spacing: { before: 300 } }),
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
                (() => {
                  const uri = vistoria.assinatura_uri;
                  if (uri === "__recusou_assinar__") {
                    return new Paragraph({
                      children: [new TextRun({ text: "Recusou-se a assinar", size: 18, bold: true, color: "92400E" })],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 200 },
                    });
                  }
                  if (uri === "__ninguem_no_local__") {
                    return new Paragraph({
                      children: [new TextRun({ text: "Ninguem no local", size: 18, bold: true, color: "1E40AF" })],
                      alignment: AlignmentType.CENTER,
                      spacing: { before: 200 },
                    });
                  }
                  if (uri) {
                    const sigBuffer = base64ToBuffer(uri);
                    if (sigBuffer) {
                      try {
                        return new Paragraph({
                          children: [new ImageRun({ data: sigBuffer, transformation: { width: 150, height: 50 }, type: "png" })],
                          alignment: AlignmentType.CENTER,
                        });
                      } catch {}
                    }
                  }
                  return new Paragraph({ children: [], spacing: { before: 300 } });
                })(),
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

  sections.push(
    new Paragraph({ children: [], spacing: { before: 400 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: "EcoBrasil Consultoria Ambiental - CBA",
          size: 16,
          color: "666666",
        }),
      ],
      alignment: AlignmentType.CENTER,
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      },
      spacing: { before: 100 },
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
