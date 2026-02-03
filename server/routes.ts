import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as bcrypt from "bcryptjs";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat";
import pdfRoutes from "./routes/pdf";
import docxRoutes from "./routes/docx";
import aiRoutes from "./ai-routes";
import mapbiomasRoutes from "./mapbiomas-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register AI chat routes
  registerChatRoutes(app);
  
  // Register AI environmental analysis routes
  app.use("/api/ai", aiRoutes);
  
  // Register MapBiomas routes
  app.use("/api/mapbiomas", mapbiomasRoutes);
  
  // Register PDF routes
  app.use("/api/pdf", pdfRoutes);
  
  // Register Word document routes
  app.use("/api/docx", docxRoutes);
  // Auth routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: result.error.flatten() 
        });
      }

      const { email, senha } = result.data;
      const usuario = await storage.getUsuarioByEmail(email);

      if (!usuario) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
      
      if (!senhaValida) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      const { senha_hash, ...userWithoutPassword } = usuario;
      
      return res.json({ 
        user: userWithoutPassword,
        message: "Login realizado com sucesso" 
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: result.error.flatten() 
        });
      }

      const { nome, email, senha, tipo_usuario } = result.data;
      
      const existingUser = await storage.getUsuarioByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const senha_hash = await bcrypt.hash(senha, 10);
      
      const usuario = await storage.createUsuario({
        nome,
        email,
        tipo_usuario,
        senha_hash,
      });

      const { senha_hash: _, ...userWithoutPassword } = usuario;
      
      return res.status(201).json({ 
        user: userWithoutPassword,
        message: "Usuário criado com sucesso" 
      });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Vistoria routes
  app.get("/api/vistorias", async (req: Request, res: Response) => {
    try {
      const usuarioId = req.query.usuario_id as string;
      
      if (!usuarioId) {
        return res.status(400).json({ message: "usuario_id é obrigatório" });
      }

      const vistorias = await storage.getVistoriasByUsuario(usuarioId);
      return res.json(vistorias);
    } catch (error) {
      console.error("Get vistorias error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/vistorias/:id", async (req: Request, res: Response) => {
    try {
      const vistoria = await storage.getVistoria(req.params.id);
      
      if (!vistoria) {
        return res.status(404).json({ message: "Vistoria não encontrada" });
      }

      const coordenadas = await storage.getCoordenadas(vistoria.id);
      const usosSolo = await storage.getUsosSolo(vistoria.id);
      const fotos = await storage.getFotos(vistoria.id);

      return res.json({
        ...vistoria,
        coordenadas,
        usosSolo,
        fotos,
      });
    } catch (error) {
      console.error("Get vistoria error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/vistorias", async (req: Request, res: Response) => {
    try {
      const { coordenadas, usosSolo, fotos, ...vistoriaData } = req.body;
      
      const vistoria = await storage.createVistoria(vistoriaData);

      if (coordenadas && Array.isArray(coordenadas)) {
        for (const coord of coordenadas) {
          await storage.createCoordenada({
            ...coord,
            vistoria_id: vistoria.id,
          });
        }
      }

      if (usosSolo && Array.isArray(usosSolo)) {
        for (const uso of usosSolo) {
          await storage.createUsoSolo({
            ...uso,
            vistoria_id: vistoria.id,
          });
        }
      }

      if (fotos && Array.isArray(fotos)) {
        for (const foto of fotos) {
          await storage.createFoto({
            ...foto,
            vistoria_id: vistoria.id,
          });
        }
      }

      return res.status(201).json(vistoria);
    } catch (error) {
      console.error("Create vistoria error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/vistorias/:id", async (req: Request, res: Response) => {
    try {
      const vistoria = await storage.updateVistoria(req.params.id, req.body);
      
      if (!vistoria) {
        return res.status(404).json({ message: "Vistoria não encontrada" });
      }

      return res.json(vistoria);
    } catch (error) {
      console.error("Update vistoria error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/vistorias/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      
      await storage.deleteCoordenadas(id);
      await storage.deleteUsosSolo(id);
      await storage.deleteFotos(id);
      await storage.deleteVistoria(id);

      return res.json({ message: "Vistoria excluída com sucesso" });
    } catch (error) {
      console.error("Delete vistoria error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
