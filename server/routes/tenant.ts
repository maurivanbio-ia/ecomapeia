import { Router, Request, Response } from "express";
import { db } from "../db";
import { empresas, projetos, usuarios, vistorias, complexos } from "../../shared/schema";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

// ==========================================
// EMPRESAS (Companies) ENDPOINTS
// ==========================================

router.get("/empresas", async (_req: Request, res: Response) => {
  try {
    const result = await db.select().from(empresas).where(eq(empresas.ativa, true));
    res.json(result);
  } catch (error) {
    console.error("Error fetching empresas:", error);
    res.status(500).json({ error: "Erro ao buscar empresas" });
  }
});

router.get("/empresas/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const result = await db.select().from(empresas).where(eq(empresas.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching empresa:", error);
    res.status(500).json({ error: "Erro ao buscar empresa" });
  }
});

router.post("/empresas", async (req: Request, res: Response) => {
  try {
    const { nome, cnpj, logo_url, cor_primaria, cor_secundaria, endereco, telefone, email_contato } = req.body;
    
    if (!nome) {
      return res.status(400).json({ error: "Nome da empresa é obrigatório" });
    }

    const result = await db.insert(empresas).values({
      nome,
      cnpj,
      logo_url,
      cor_primaria,
      cor_secundaria,
      endereco,
      telefone,
      email_contato,
    }).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating empresa:", error);
    res.status(500).json({ error: "Erro ao criar empresa" });
  }
});

router.put("/empresas/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const updates = req.body;

    const result = await db.update(empresas)
      .set(updates)
      .where(eq(empresas.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating empresa:", error);
    res.status(500).json({ error: "Erro ao atualizar empresa" });
  }
});

// ==========================================
// PROJETOS (Projects) ENDPOINTS
// ==========================================

router.get("/empresas/:empresaId/projetos", async (req: Request, res: Response) => {
  try {
    const empresaId = parseInt(String(req.params.empresaId));
    const result = await db.select()
      .from(projetos)
      .where(and(
        eq(projetos.empresa_id, empresaId),
        eq(projetos.ativo, true)
      ));
    res.json(result);
  } catch (error) {
    console.error("Error fetching projetos:", error);
    res.status(500).json({ error: "Erro ao buscar projetos" });
  }
});

router.get("/projetos", async (req: Request, res: Response) => {
  try {
    const empresaIdParam = req.query.empresa_id;
    
    let result;
    if (empresaIdParam) {
      const empresaId = parseInt(String(empresaIdParam));
      result = await db.select()
        .from(projetos)
        .where(and(
          eq(projetos.empresa_id, empresaId),
          eq(projetos.ativo, true)
        ));
    } else {
      result = await db.select()
        .from(projetos)
        .where(eq(projetos.ativo, true));
    }
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching projetos:", error);
    res.status(500).json({ error: "Erro ao buscar projetos" });
  }
});

router.get("/projetos/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const result = await db.select().from(projetos).where(eq(projetos.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Error fetching projeto:", error);
    res.status(500).json({ error: "Erro ao buscar projeto" });
  }
});

router.post("/projetos", async (req: Request, res: Response) => {
  try {
    const { empresa_id, nome, descricao, codigo, localizacao, area_km2, reservatorio, rio_principal, municipios } = req.body;
    
    if (!nome || !empresa_id) {
      return res.status(400).json({ error: "Nome e empresa_id são obrigatórios" });
    }

    const result = await db.insert(projetos).values({
      empresa_id,
      nome,
      descricao,
      codigo,
      localizacao,
      area_km2,
      reservatorio,
      rio_principal,
      municipios,
    }).returning();

    res.status(201).json(result[0]);
  } catch (error) {
    console.error("Error creating projeto:", error);
    res.status(500).json({ error: "Erro ao criar projeto" });
  }
});

router.put("/projetos/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id));
    const updates = req.body;

    const result = await db.update(projetos)
      .set(updates)
      .where(eq(projetos.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Projeto não encontrado" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating projeto:", error);
    res.status(500).json({ error: "Erro ao atualizar projeto" });
  }
});

// ==========================================
// USER-COMPANY ASSOCIATION
// ==========================================

router.get("/usuarios/:userId/tenant", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);

    // ─── Fallback para MemStorage (sem banco de dados) ──────────────────────
    if (!process.env.DATABASE_URL) {
      const { memStorage, COMPLEXOS_DATA } = await import("../mem-storage");
      const memUser = await memStorage.getUsuario(userId);
      if (!memUser) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Montar lista completa de projetos a partir do COMPLEXOS_DATA
      const projetosDisponiveis: any[] = [];
      for (const complexo of COMPLEXOS_DATA) {
        for (const uhe of complexo.uhes) {
          projetosDisponiveis.push({
            id: uhe.id,
            nome: uhe.nome,
            codigo: uhe.codigo,
            complexo_id: complexo.id,
            complexo_nome: complexo.nome,
            empresa_id: complexo.empresa_id,
            ativo: true,
            descricao: null,
            reservatorio: null,
            rio_principal: null,
            municipios: null,
          });
        }
      }

      // projetoAtual: ler do campo projeto_atual_id do usuário em memória
      let projetoAtual = null;
      const projetoAtualId = (memUser as any).projeto_atual_id;
      if (projetoAtualId) {
        projetoAtual = projetosDisponiveis.find(p => p.id === projetoAtualId) || null;
      }

      const empresa = memUser.empresa_id
        ? { id: memUser.empresa_id, nome: "CBA – Companhia Brasileira de Alumínio", cnpj: null }
        : null;

      return res.json({
        empresa,
        projetoAtual,
        projetosDisponiveis,
        isAdmin: memUser.is_admin ?? false,
      });
    }

    // ─── Caminho normal com banco de dados ─────────────────────────────────
    const user = await db.select().from(usuarios).where(eq(usuarios.id, userId));
    
    if (user.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userData = user[0];
    let empresa = null;
    let projetoAtual = null;
    let projetosDisponiveis: any[] = [];

    if (userData.empresa_id) {
      const empresaResult = await db.select().from(empresas).where(eq(empresas.id, userData.empresa_id));
      empresa = empresaResult[0] || null;
    }

    const projetosRaw = await db
      .select({
        id: projetos.id,
        empresa_id: projetos.empresa_id,
        complexo_id: projetos.complexo_id,
        complexo_nome: complexos.nome,
        nome: projetos.nome,
        codigo: projetos.codigo,
        descricao: projetos.descricao,
        reservatorio: projetos.reservatorio,
        rio_principal: projetos.rio_principal,
        municipios: projetos.municipios,
        ativo: projetos.ativo,
      })
      .from(projetos)
      .leftJoin(complexos, eq(projetos.complexo_id, complexos.id))
      .where(eq(projetos.ativo, true))
      .orderBy(complexos.nome, projetos.nome);
    projetosDisponiveis = projetosRaw;

    if (userData.projeto_atual_id) {
      const projetoResult = await db.select().from(projetos).where(eq(projetos.id, userData.projeto_atual_id));
      projetoAtual = projetoResult[0] || null;
    }

    res.json({
      empresa,
      projetoAtual,
      projetosDisponiveis,
      isAdmin: userData.is_admin,
    });
  } catch (error) {
    console.error("Error fetching user tenant:", error);
    res.status(500).json({ error: "Erro ao buscar dados do tenant" });
  }
});

router.post("/usuarios/:userId/empresa", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const { empresa_id } = req.body;

    const result = await db.update(usuarios)
      .set({ empresa_id })
      .where(eq(usuarios.id, userId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error associating user with empresa:", error);
    res.status(500).json({ error: "Erro ao associar usuário à empresa" });
  }
});

router.post("/usuarios/:userId/projeto", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const { projeto_id } = req.body;

    // Fallback para MemStorage
    if (!process.env.DATABASE_URL) {
      const { memStorage } = await import("../mem-storage");
      const updated = await memStorage.updateUsuario(userId, { projeto_atual_id: projeto_id } as any);
      if (!updated) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      return res.json(updated);
    }

    const result = await db.update(usuarios)
      .set({ projeto_atual_id: projeto_id })
      .where(eq(usuarios.id, userId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error setting user projeto:", error);
    res.status(500).json({ error: "Erro ao definir projeto do usuário" });
  }
});

// ==========================================
// VISTORIAS BY PROJECT
// ==========================================

router.get("/projetos/:projetoId/vistorias", async (req: Request, res: Response) => {
  try {
    const projetoId = parseInt(String(req.params.projetoId));
    
    const result = await db.select()
      .from(vistorias)
      .where(eq(vistorias.projeto_id, projetoId));
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching vistorias by projeto:", error);
    res.status(500).json({ error: "Erro ao buscar vistorias do projeto" });
  }
});

// ==========================================
// EMPRESA USUARIOS (Company Users)
// ==========================================

router.get("/empresas/:empresaId/usuarios", async (req: Request, res: Response) => {
  try {
    const empresaId = parseInt(String(req.params.empresaId));
    
    const result = await db.select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      tipo_usuario: usuarios.tipo_usuario,
      is_admin: usuarios.is_admin,
      projeto_atual_id: usuarios.projeto_atual_id,
    })
      .from(usuarios)
      .where(eq(usuarios.empresa_id, empresaId));
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching empresa usuarios:", error);
    res.status(500).json({ error: "Erro ao buscar usuários da empresa" });
  }
});

router.post("/usuarios/invite", async (req: Request, res: Response) => {
  try {
    const { nome, email, tipo_usuario, is_admin, empresa_id } = req.body;
    
    if (!nome || !email || !empresa_id) {
      return res.status(400).json({ message: "Nome, email e empresa são obrigatórios" });
    }

    const existingUser = await db.select().from(usuarios).where(eq(usuarios.email, email));
    if (existingUser.length > 0) {
      return res.status(400).json({ message: "Este email já está cadastrado" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const senha_hash = await bcrypt.hash(tempPassword, 10);

    const result = await db.insert(usuarios).values({
      nome,
      email,
      tipo_usuario: tipo_usuario || "Fiscal",
      senha_hash,
      empresa_id,
      is_admin: is_admin || false,
    }).returning();

    res.status(201).json({ 
      ...result[0], 
      tempPassword,
      message: `Usuário criado com senha temporária: ${tempPassword}` 
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).json({ error: "Erro ao convidar usuário" });
  }
});

router.put("/usuarios/:userId/admin", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const { is_admin } = req.body;

    const result = await db.update(usuarios)
      .set({ is_admin })
      .where(eq(usuarios.id, userId))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result[0]);
  } catch (error) {
    console.error("Error updating user admin status:", error);
    res.status(500).json({ error: "Erro ao atualizar status de admin" });
  }
});

// ==========================================
// DASHBOARD EMPRESA
// ==========================================

router.get("/empresas/:empresaId/dashboard", async (req: Request, res: Response) => {
  try {
    const empresaId = parseInt(String(req.params.empresaId));

    const projetosEmpresa = await db.select()
      .from(projetos)
      .where(eq(projetos.empresa_id, empresaId));
    
    const projetoIds = projetosEmpresa.map(p => p.id);

    const usuariosCount = await db.select({ count: count() })
      .from(usuarios)
      .where(eq(usuarios.empresa_id, empresaId));

    let vistoriasData: any[] = [];
    let vistoriasPorStatus: { status: string; count: number }[] = [];
    let vistoriasPorProjeto: { projeto: string; count: number }[] = [];

    if (projetoIds.length > 0) {
      vistoriasData = await db.select()
        .from(vistorias)
        .where(inArray(vistorias.projeto_id, projetoIds));

      const statusCounts: Record<string, number> = {};
      const projetoCounts: Record<string, number> = {};

      for (const v of vistoriasData) {
        const status = v.status || "pendente";
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        const proj = projetosEmpresa.find(p => p.id === v.projeto_id);
        if (proj) {
          projetoCounts[proj.nome] = (projetoCounts[proj.nome] || 0) + 1;
        }
      }

      vistoriasPorStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));
      vistoriasPorProjeto = Object.entries(projetoCounts).map(([projeto, count]) => ({ projeto, count }));
    }

    res.json({
      totalVistorias: vistoriasData.length,
      vistoriasPorStatus,
      vistoriasPorProjeto,
      vistoriasPorMes: [],
      totalUsuarios: usuariosCount[0]?.count || 0,
      totalProjetos: projetosEmpresa.length,
    });
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    res.status(500).json({ error: "Erro ao buscar dados do dashboard" });
  }
});

// ==========================================
// EXPORT DATA
// ==========================================

router.get("/empresas/:empresaId/export/csv", async (req: Request, res: Response) => {
  try {
    const empresaId = parseInt(String(req.params.empresaId));

    const empresa = await db.select().from(empresas).where(eq(empresas.id, empresaId));
    if (empresa.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const projetosEmpresa = await db.select()
      .from(projetos)
      .where(eq(projetos.empresa_id, empresaId));
    
    const projetoIds = projetosEmpresa.map(p => p.id);
    const projetoMap = new Map(projetosEmpresa.map(p => [p.id, p.nome]));

    let vistoriasData: any[] = [];
    if (projetoIds.length > 0) {
      vistoriasData = await db.select()
        .from(vistorias)
        .where(inArray(vistorias.projeto_id, projetoIds));
    }

    const headers = [
      "ID", "Projeto", "Proprietário", "CPF/CNPJ", "Status", 
      "Data Vistoria", "Município", "Localidade", "Observações"
    ];

    const rows = vistoriasData.map(v => [
      v.id,
      projetoMap.get(v.projeto_id) || "",
      v.proprietario_nome || "",
      v.proprietario_cpf_cnpj || "",
      v.status || "",
      v.data_vistoria || "",
      v.municipio || "",
      v.localidade || "",
      (v.observacoes || "").replace(/"/g, '""'),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=relatorio_${empresa[0].nome.replace(/\s/g, "_")}.csv`);
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("Error exporting CSV:", error);
    res.status(500).json({ error: "Erro ao exportar CSV" });
  }
});

router.get("/empresas/:empresaId/export/excel", async (req: Request, res: Response) => {
  try {
    const empresaId = parseInt(String(req.params.empresaId));

    const empresa = await db.select().from(empresas).where(eq(empresas.id, empresaId));
    if (empresa.length === 0) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const projetosEmpresa = await db.select()
      .from(projetos)
      .where(eq(projetos.empresa_id, empresaId));
    
    const projetoIds = projetosEmpresa.map(p => p.id);
    const projetoMap = new Map(projetosEmpresa.map(p => [p.id, p.nome]));

    let vistoriasData: any[] = [];
    if (projetoIds.length > 0) {
      vistoriasData = await db.select()
        .from(vistorias)
        .where(inArray(vistorias.projeto_id, projetoIds));
    }

    const headers = [
      "ID", "Projeto", "Proprietário", "CPF/CNPJ", "Status", 
      "Data Vistoria", "Município", "Localidade", "Observações"
    ];

    const rows = vistoriasData.map(v => [
      v.id,
      projetoMap.get(v.projeto_id) || "",
      v.proprietario_nome || "",
      v.proprietario_cpf_cnpj || "",
      v.status || "",
      v.data_vistoria || "",
      v.municipio || "",
      v.localidade || "",
      v.observacoes || "",
    ]);

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
    xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xmlContent += '<Worksheet ss:Name="Vistorias">\n<Table>\n';

    xmlContent += '<Row>\n';
    for (const header of headers) {
      xmlContent += `<Cell><Data ss:Type="String">${header}</Data></Cell>\n`;
    }
    xmlContent += '</Row>\n';

    for (const row of rows) {
      xmlContent += '<Row>\n';
      for (const cell of row) {
        const cellValue = String(cell).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        xmlContent += `<Cell><Data ss:Type="String">${cellValue}</Data></Cell>\n`;
      }
      xmlContent += '</Row>\n';
    }

    xmlContent += '</Table>\n</Worksheet>\n</Workbook>';

    res.setHeader("Content-Type", "application/vnd.ms-excel");
    res.setHeader("Content-Disposition", `attachment; filename=relatorio_${empresa[0].nome.replace(/\s/g, "_")}.xlsx`);
    res.send(xmlContent);
  } catch (error) {
    console.error("Error exporting Excel:", error);
    res.status(500).json({ error: "Erro ao exportar Excel" });
  }
});

// ==========================================
// ADMIN USER MANAGEMENT ENDPOINTS
// ==========================================

router.get("/admin/usuarios", async (req: Request, res: Response) => {
  try {
    const { empresa_id } = req.query;
    if (!empresa_id) {
      return res.status(400).json({ error: "empresa_id é obrigatório" });
    }

    const result = await db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        tipo_usuario: usuarios.tipo_usuario,
        is_admin: usuarios.is_admin,
        complexo_id: usuarios.complexo_id,
        projeto_atual_id: usuarios.projeto_atual_id,
        empresa_id: usuarios.empresa_id,
        complexo_nome: complexos.nome,
        projeto_nome: projetos.nome,
      })
      .from(usuarios)
      .leftJoin(complexos, eq(complexos.id, usuarios.complexo_id))
      .leftJoin(projetos, eq(projetos.id, usuarios.projeto_atual_id))
      .where(eq(usuarios.empresa_id, parseInt(String(empresa_id))))
      .orderBy(usuarios.nome);

    res.json(result);
  } catch (error) {
    console.error("Error fetching admin usuarios:", error);
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.put("/admin/usuarios/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { tipo_usuario, complexo_id, projeto_atual_id, is_admin } = req.body;

    const updates: Record<string, unknown> = {};
    if (tipo_usuario !== undefined) updates.tipo_usuario = tipo_usuario;
    if (complexo_id !== undefined) updates.complexo_id = complexo_id || null;
    if (projeto_atual_id !== undefined) updates.projeto_atual_id = projeto_atual_id || null;
    if (is_admin !== undefined) updates.is_admin = is_admin;

    await db.update(usuarios).set(updates).where(eq(usuarios.id, userId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating usuario:", error);
    res.status(500).json({ error: "Erro ao atualizar usuário" });
  }
});

router.delete("/admin/usuarios/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    await db.delete(usuarios).where(eq(usuarios.id, userId));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting usuario:", error);
    res.status(500).json({ error: "Erro ao remover usuário" });
  }
});

export default router;
