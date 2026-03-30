import { Router, Request, Response } from "express";
import { db } from "../db";
import { complexos, projetos, usuarios, vistorias } from "../../shared/schema";
import { eq, and, inArray, count, sql } from "drizzle-orm";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(complexos)
      .where(eq(complexos.ativo, true))
      .orderBy(complexos.nome);
    res.json(result);
  } catch (error) {
    console.error("Error fetching complexos:", error);
    res.status(500).json({ error: "Erro ao buscar complexos" });
  }
});

router.get("/all-uhes", async (_req: Request, res: Response) => {
  try {
    const result = await db
      .select()
      .from(projetos)
      .where(eq(projetos.ativo, true))
      .orderBy(projetos.nome);
    res.json(result);
  } catch (error) {
    console.error("Error fetching all uhes:", error);
    res.status(500).json({ error: "Erro ao buscar UHEs" });
  }
});

router.get("/admin/stats", async (_req: Request, res: Response) => {
  try {
    const allComplexos = await db.select().from(complexos).where(eq(complexos.ativo, true));

    const statsPromises = allComplexos.map(async (complexo) => {
      const uhes = await db
        .select()
        .from(projetos)
        .where(and(eq(projetos.complexo_id, complexo.id), eq(projetos.ativo, true)));

      const uheIds = uhes.map((u) => u.id);

      let totalVistorias = 0;
      if (uheIds.length > 0) {
        const [row] = await db
          .select({ count: count() })
          .from(vistorias)
          .where(inArray(vistorias.projeto_id, uheIds));
        totalVistorias = Number(row?.count ?? 0);
      }

      const [usersRow] = await db
        .select({ count: count() })
        .from(usuarios)
        .where(eq(usuarios.complexo_id, complexo.id));

      return {
        ...complexo,
        totalUhes: uhes.length,
        uhes,
        totalVistorias,
        totalUsuarios: Number(usersRow?.count ?? 0),
      };
    });

    const stats = await Promise.all(statsPromises);

    const totais = {
      vistorias: stats.reduce((acc, s) => acc + s.totalVistorias, 0),
      uhes: stats.reduce((acc, s) => acc + s.totalUhes, 0),
      usuarios: stats.reduce((acc, s) => acc + s.totalUsuarios, 0),
      complexos: stats.length,
    };

    res.json({ complexos: stats, totais });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
});

router.get("/admin/vistorias", async (req: Request, res: Response) => {
  try {
    const { complexo_id } = req.query;
    if (complexo_id) {
      const uhes = await db
        .select({ id: projetos.id })
        .from(projetos)
        .where(eq(projetos.complexo_id, parseInt(complexo_id as string)));
      const uheIds = uhes.map((u) => u.id);
      if (uheIds.length === 0) return res.json([]);
      const result = await db
        .select()
        .from(vistorias)
        .where(inArray(vistorias.projeto_id, uheIds));
      return res.json(result.map((v) => ({ ...v, status_upload: "synced" })));
    }
    const result = await db.select().from(vistorias).orderBy(sql`created_at DESC`).limit(200);
    res.json(result.map((v) => ({ ...v, status_upload: "synced" })));
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar vistorias admin" });
  }
});

router.get("/admin/usuarios", async (_req: Request, res: Response) => {
  try {
    const result = await db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        tipo_usuario: usuarios.tipo_usuario,
        empresa_id: usuarios.empresa_id,
        complexo_id: usuarios.complexo_id,
        is_admin: usuarios.is_admin,
        created_at: usuarios.created_at,
      })
      .from(usuarios)
      .orderBy(usuarios.created_at);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar usuários" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [complexo] = await db.select().from(complexos).where(eq(complexos.id, id));
    if (!complexo) return res.status(404).json({ error: "Complexo não encontrado" });
    res.json(complexo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar complexo" });
  }
});

router.get("/:id/uhes", async (req: Request, res: Response) => {
  try {
    const complexo_id = parseInt(req.params.id);
    const result = await db
      .select()
      .from(projetos)
      .where(and(eq(projetos.complexo_id, complexo_id), eq(projetos.ativo, true)))
      .orderBy(projetos.nome);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar UHEs" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { nome, descricao, empresa_id } = req.body;
    if (!nome || !empresa_id) {
      return res.status(400).json({ error: "Nome e empresa_id são obrigatórios" });
    }
    const [result] = await db.insert(complexos).values({ nome, descricao, empresa_id }).returning();
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating complexo:", error);
    res.status(500).json({ error: "Erro ao criar complexo" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { nome, descricao, ativo } = req.body;
    const [result] = await db
      .update(complexos)
      .set({ nome, descricao, ativo })
      .where(eq(complexos.id, id))
      .returning();
    if (!result) return res.status(404).json({ error: "Complexo não encontrado" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar complexo" });
  }
});

router.post("/:id/uhes", async (req: Request, res: Response) => {
  try {
    const complexo_id = parseInt(req.params.id);
    const { nome, codigo, descricao, reservatorio, rio_principal, municipios, empresa_id } = req.body;
    if (!nome || !empresa_id) {
      return res.status(400).json({ error: "Nome e empresa_id são obrigatórios" });
    }
    const [result] = await db
      .insert(projetos)
      .values({ nome, codigo, descricao, reservatorio, rio_principal, municipios, empresa_id, complexo_id })
      .returning();
    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating UHE:", error);
    res.status(500).json({ error: "Erro ao criar UHE" });
  }
});

router.put("/uhes/:uheId", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.uheId);
    const updates = req.body;
    const [result] = await db.update(projetos).set(updates).where(eq(projetos.id, id)).returning();
    if (!result) return res.status(404).json({ error: "UHE não encontrada" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar UHE" });
  }
});

export default router;
