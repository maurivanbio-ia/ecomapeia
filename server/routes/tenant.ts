import { Router, Request, Response } from "express";
import { db } from "../db";
import { empresas, projetos, usuarios, vistorias } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

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

      projetosDisponiveis = await db.select()
        .from(projetos)
        .where(and(
          eq(projetos.empresa_id, userData.empresa_id),
          eq(projetos.ativo, true)
        ));
    }

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

export default router;
