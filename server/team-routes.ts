import { Router, Request, Response } from "express";
import { db } from "./db";
import { equipes, membros_equipe, notificacoes, atribuicoes_vistoria, usuarios, vistorias } from "@shared/schema";
import { eq, desc, and, ilike } from "drizzle-orm";

const router = Router();

// ============================================
// TEAMS MANAGEMENT
// ============================================

// Get all teams
router.get("/equipes", async (req: Request, res: Response) => {
  try {
    const teams = await db.select().from(equipes).orderBy(desc(equipes.created_at));
    return res.json({ success: true, teams });
  } catch (error) {
    console.error("Get teams error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar equipes" });
  }
});

// Create a team
router.post("/equipes", async (req: Request, res: Response) => {
  try {
    const { nome, descricao, responsavel_id } = req.body;

    if (!nome) {
      return res.status(400).json({ success: false, error: "Nome da equipe é obrigatório" });
    }

    const [team] = await db.insert(equipes).values({
      nome,
      descricao,
      responsavel_id,
    }).returning();

    return res.json({ success: true, team });
  } catch (error) {
    console.error("Create team error:", error);
    return res.status(500).json({ success: false, error: "Erro ao criar equipe" });
  }
});

// Get team members
router.get("/equipes/:id/membros", async (req: Request, res: Response) => {
  try {
    const equipeId = parseInt(req.params.id);
    
    const members = await db
      .select({
        id: membros_equipe.id,
        role: membros_equipe.role,
        joined_at: membros_equipe.joined_at,
        usuario: {
          id: usuarios.id,
          nome: usuarios.nome,
          email: usuarios.email,
          tipo_usuario: usuarios.tipo_usuario,
        },
      })
      .from(membros_equipe)
      .innerJoin(usuarios, eq(membros_equipe.usuario_id, usuarios.id))
      .where(eq(membros_equipe.equipe_id, equipeId));

    return res.json({ success: true, members });
  } catch (error) {
    console.error("Get team members error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar membros" });
  }
});

// Add member to team
router.post("/equipes/:id/membros", async (req: Request, res: Response) => {
  try {
    const equipeId = parseInt(req.params.id);
    const { usuario_id, role = "membro" } = req.body;

    if (!usuario_id) {
      return res.status(400).json({ success: false, error: "ID do usuário é obrigatório" });
    }

    const [member] = await db.insert(membros_equipe).values({
      equipe_id: equipeId,
      usuario_id,
      role,
    }).returning();

    return res.json({ success: true, member });
  } catch (error) {
    console.error("Add team member error:", error);
    return res.status(500).json({ success: false, error: "Erro ao adicionar membro" });
  }
});

// Remove member from team
router.delete("/equipes/:equipeId/membros/:membroId", async (req: Request, res: Response) => {
  try {
    const membroId = parseInt(req.params.membroId);

    await db.delete(membros_equipe).where(eq(membros_equipe.id, membroId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Remove team member error:", error);
    return res.status(500).json({ success: false, error: "Erro ao remover membro" });
  }
});

// ============================================
// NOTIFICATIONS
// ============================================

// Get user notifications
router.get("/notificacoes/:usuarioId", async (req: Request, res: Response) => {
  try {
    const usuarioId = req.params.usuarioId;
    
    const notifications = await db
      .select()
      .from(notificacoes)
      .where(eq(notificacoes.usuario_id, usuarioId))
      .orderBy(desc(notificacoes.created_at))
      .limit(50);

    return res.json({ success: true, notifications });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar notificações" });
  }
});

// Create notification
router.post("/notificacoes", async (req: Request, res: Response) => {
  try {
    const { usuario_id, titulo, mensagem, tipo = "info", vistoria_id } = req.body;

    if (!usuario_id || !titulo || !mensagem) {
      return res.status(400).json({ success: false, error: "Dados incompletos" });
    }

    const [notification] = await db.insert(notificacoes).values({
      usuario_id,
      titulo,
      mensagem,
      tipo,
      vistoria_id,
    }).returning();

    return res.json({ success: true, notification });
  } catch (error) {
    console.error("Create notification error:", error);
    return res.status(500).json({ success: false, error: "Erro ao criar notificação" });
  }
});

// Mark notification as read
router.put("/notificacoes/:id/lida", async (req: Request, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);

    await db.update(notificacoes)
      .set({ lida: 1 })
      .where(eq(notificacoes.id, notificationId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ success: false, error: "Erro ao marcar notificação" });
  }
});

// Mark all notifications as read for user
router.put("/notificacoes/usuario/:usuarioId/lidas", async (req: Request, res: Response) => {
  try {
    const usuarioId = req.params.usuarioId;

    await db.update(notificacoes)
      .set({ lida: 1 })
      .where(eq(notificacoes.usuario_id, usuarioId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ success: false, error: "Erro ao marcar notificações" });
  }
});

// Get unread notification count
router.get("/notificacoes/:usuarioId/count", async (req: Request, res: Response) => {
  try {
    const usuarioId = req.params.usuarioId;
    
    const result = await db
      .select()
      .from(notificacoes)
      .where(and(eq(notificacoes.usuario_id, usuarioId), eq(notificacoes.lida, 0)));

    return res.json({ success: true, count: result.length });
  } catch (error) {
    console.error("Get notification count error:", error);
    return res.status(500).json({ success: false, error: "Erro ao contar notificações" });
  }
});

// ============================================
// VISTORIA ASSIGNMENTS
// ============================================

// Get assignments for a user
router.get("/atribuicoes/usuario/:usuarioId", async (req: Request, res: Response) => {
  try {
    const usuarioId = req.params.usuarioId;
    
    const assignments = await db
      .select({
        id: atribuicoes_vistoria.id,
        prazo: atribuicoes_vistoria.prazo,
        status: atribuicoes_vistoria.status,
        created_at: atribuicoes_vistoria.created_at,
        vistoria: {
          id: vistorias.id,
          proprietario: vistorias.proprietario,
          municipio: vistorias.municipio,
          data_vistoria: vistorias.data_vistoria,
        },
      })
      .from(atribuicoes_vistoria)
      .innerJoin(vistorias, eq(atribuicoes_vistoria.vistoria_id, vistorias.id))
      .where(eq(atribuicoes_vistoria.usuario_id, usuarioId))
      .orderBy(desc(atribuicoes_vistoria.created_at));

    return res.json({ success: true, assignments });
  } catch (error) {
    console.error("Get user assignments error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar atribuições" });
  }
});

// Assign vistoria to user
router.post("/atribuicoes", async (req: Request, res: Response) => {
  try {
    const { vistoria_id, usuario_id, atribuido_por, prazo } = req.body;

    if (!vistoria_id || !usuario_id) {
      return res.status(400).json({ success: false, error: "Dados incompletos" });
    }

    const [assignment] = await db.insert(atribuicoes_vistoria).values({
      vistoria_id,
      usuario_id,
      atribuido_por,
      prazo,
      status: "pendente",
    }).returning();

    // Create notification for assigned user
    await db.insert(notificacoes).values({
      usuario_id,
      titulo: "Nova vistoria atribuída",
      mensagem: `Uma nova vistoria foi atribuída a você${prazo ? ` com prazo para ${prazo}` : ""}.`,
      tipo: "info",
      vistoria_id,
    });

    return res.json({ success: true, assignment });
  } catch (error) {
    console.error("Create assignment error:", error);
    return res.status(500).json({ success: false, error: "Erro ao criar atribuição" });
  }
});

// Update assignment status
router.put("/atribuicoes/:id/status", async (req: Request, res: Response) => {
  try {
    const assignmentId = parseInt(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Status é obrigatório" });
    }

    await db.update(atribuicoes_vistoria)
      .set({ status })
      .where(eq(atribuicoes_vistoria.id, assignmentId));

    return res.json({ success: true });
  } catch (error) {
    console.error("Update assignment status error:", error);
    return res.status(500).json({ success: false, error: "Erro ao atualizar status" });
  }
});

// ============================================
// PROPERTY HISTORY
// ============================================

// Get vistorias by property (proprietario)
router.get("/historico-propriedade", async (req: Request, res: Response) => {
  try {
    const { proprietario, cpf_cnpj } = req.query;

    if (!proprietario && !cpf_cnpj) {
      return res.status(400).json({ success: false, error: "Proprietário ou CPF/CNPJ é obrigatório" });
    }

    let query = db.select().from(vistorias);
    
    if (proprietario) {
      query = query.where(ilike(vistorias.proprietario, `%${proprietario}%`));
    }

    const history = await query.orderBy(desc(vistorias.data_vistoria));

    return res.json({ success: true, history });
  } catch (error) {
    console.error("Get property history error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar histórico" });
  }
});

// Get all users (for team management)
router.get("/usuarios", async (req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        email: usuarios.email,
        tipo_usuario: usuarios.tipo_usuario,
      })
      .from(usuarios)
      .orderBy(usuarios.nome);

    return res.json({ success: true, users });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ success: false, error: "Erro ao buscar usuários" });
  }
});

export default router;
