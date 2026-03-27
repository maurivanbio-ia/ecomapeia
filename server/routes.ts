import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as bcrypt from "bcryptjs";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat";
import pdfRoutes from "./routes/pdf";
import docxRoutes from "./routes/docx";
import kmzRoutes from "./routes/kmz";
import reportsRoutes from "./routes/reports";
import tenantRoutes from "./routes/tenant";
import complexosRoutes from "./routes/complexos";
import authRoutes from "./routes/auth";
import aiRoutes from "./ai-routes";
import mapbiomasRoutes from "./mapbiomas-routes";
import environmentalRoutes from "./environmental-routes";
import conservationRoutes from "./conservation-routes";
import featuresRoutes from "./features-routes";
import teamRoutes from "./team-routes";
import { db } from "./db";
import { eq as eqOp } from "drizzle-orm";
import { empresas, complexos, projetos } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register AI chat routes
  registerChatRoutes(app);
  
  // Register AI environmental analysis routes
  app.use("/api/ai", aiRoutes);
  
  // Register MapBiomas routes
  app.use("/api/mapbiomas", mapbiomasRoutes);
  
  // Register Environmental Data APIs (INPE, ANA, IBGE, SiBBr, Satellite)
  app.use("/api/environmental", environmentalRoutes);
  
  // Register Conservation Units and Indigenous Lands APIs
  app.use("/api/conservation", conservationRoutes);
  
  // Register Features routes (weather, APP, satellite, export, OCR)
  app.use("/api/features", featuresRoutes);
  
  // Register Team and Notification routes
  app.use("/api/team", teamRoutes);
  
  // Register Multi-tenant routes (Empresas e Projetos)
  app.use("/api/tenant", tenantRoutes);

  // Register Complexos / UHEs / Admin routes
  app.use("/api/complexos", complexosRoutes);
  
  // Register PDF routes
  app.use("/api/pdf", pdfRoutes);
  
  // Register Word document routes
  app.use("/api/docx", docxRoutes);
  
  // Register KMZ export routes
  app.use("/api/kmz", kmzRoutes);
  
  // Register Summary Reports routes (by complexo/UHE)
  app.use("/api/reports", reportsRoutes);
  
  // Password reset routes (forgot password / reset)
  app.use("/api/auth", authRoutes);

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

      const { nome, email, senha, tipo_usuario, complexo_id } = result.data;
      
      const existingUser = await storage.getUsuarioByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já cadastrado" });
      }

      const senha_hash = await bcrypt.hash(senha, 10);

      let empresa_id: number | undefined;
      if (complexo_id) {
        const [complexo] = await db.select().from(complexos).where(eqOp(complexos.id, complexo_id));
        if (complexo) empresa_id = complexo.empresa_id;
      }

      const usuario = await storage.createUsuario({
        nome,
        email,
        tipo_usuario,
        senha_hash,
        empresa_id,
        complexo_id,
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
      const projetoId = req.query.projeto_id ? parseInt(req.query.projeto_id as string) : null;

      if (!usuarioId) {
        return res.status(400).json({ message: "usuario_id é obrigatório" });
      }

      let vistorias;
      if (projetoId) {
        vistorias = await storage.getVistoriasByProjeto(projetoId);
      } else {
        vistorias = await storage.getVistoriasByUsuario(usuarioId);
      }

      const vistoriasWithSyncStatus = vistorias.map(v => ({ ...v, status_upload: "synced" }));
      return res.json(vistoriasWithSyncStatus);
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
      const usosSoloDB = await storage.getUsosSolo(vistoria.id);
      const fotosDB = await storage.getFotos(vistoria.id);

      let projetoNome: string | null = null;
      if (vistoria.projeto_id) {
        const projeto = await db.select({ nome: projetos.nome, codigo: projetos.codigo })
          .from(projetos)
          .where(eqOp(projetos.id, vistoria.projeto_id))
          .limit(1);
        if (projeto.length > 0) {
          projetoNome = projeto[0].codigo
            ? `${projeto[0].codigo} – ${projeto[0].nome}`
            : projeto[0].nome;
        }
      }

      const vistoriaWithCamelCase = {
        ...vistoria,
        carInfo: vistoria.car_info,
        embargoCheck: vistoria.embargo_check,
        complianceAnalysis: vistoria.compliance_analysis,
        horaVistoria: vistoria.hora_vistoria,
        weatherData: vistoria.weather_data,
        projeto_nome: projetoNome,
      };

      const usosSolo = usosSoloDB.map(u => ({
        ...u,
        tipo: u.tipo_uso,
        valor: u.area_m2 ? String(u.area_m2) : "",
        unidade: "m²",
      }));

      const fotos = fotosDB.map(f => ({
        ...f,
        uri: f.url_imagem,
      }));

      return res.json({
        ...vistoriaWithCamelCase,
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
      const { coordenadas, coordenadas_utm, usosSolo, usos_solo, fotos, ...vistoriaData } = req.body;
      
      const vistoria = await storage.createVistoria({ ...vistoriaData, status_upload: "synced" });

      const coordsArray = coordenadas_utm || coordenadas;
      if (coordsArray && Array.isArray(coordsArray)) {
        for (const coord of coordsArray) {
          await storage.createCoordenada({
            vistoria_id: vistoria.id,
            latitude: coord.latitude ?? (parseFloat(coord.e) || 0),
            longitude: coord.longitude ?? (parseFloat(coord.n) || 0),
            ordem: coord.ordem ?? 0,
          });
        }
      }

      const usosArray = usos_solo || usosSolo;
      if (usosArray && Array.isArray(usosArray)) {
        for (const uso of usosArray) {
          await storage.createUsoSolo({
            vistoria_id: vistoria.id,
            tipo_uso: uso.tipo_uso || uso.tipo || "",
            area_m2: uso.area_m2 ?? (parseFloat(uso.valor) || null),
          });
        }
      }

      if (fotos && Array.isArray(fotos)) {
        for (const foto of fotos) {
          await storage.createFoto({
            vistoria_id: vistoria.id,
            url_imagem: foto.url_imagem || foto.uri || "",
            legenda: foto.legenda || "",
            ordem: foto.ordem ?? 0,
          });
        }
      }

      return res.status(201).json(vistoria);
    } catch (error) {
      console.error("Create vistoria error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post("/api/vistorias/sync", async (req: Request, res: Response) => {
    try {
      const { usuario_id } = req.body;
      if (!usuario_id) {
        return res.status(400).json({ message: "usuario_id é obrigatório" });
      }
      const vistorias = await storage.getVistoriasByUsuario(usuario_id);
      const pending = vistorias.filter((v) => v.status_upload !== "synced");
      let synced = 0;
      for (const v of pending) {
        await storage.updateVistoria(v.id, { status_upload: "synced" });
        synced++;
      }
      return res.json({ synced, total: vistorias.length });
    } catch (error) {
      console.error("Sync error:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/vistorias/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { coordenadas, coordenadas_utm, usosSolo, usos_solo, fotos, ...vistoriaData } = req.body;

      const vistoria = await storage.updateVistoria(id, vistoriaData);
      
      if (!vistoria) {
        return res.status(404).json({ message: "Vistoria não encontrada" });
      }

      // Re-save usos_solo (delete then insert)
      const usosArray = usos_solo || usosSolo;
      if (usosArray && Array.isArray(usosArray)) {
        await storage.deleteUsosSolo(id);
        for (const uso of usosArray) {
          await storage.createUsoSolo({
            vistoria_id: id,
            tipo_uso: uso.tipo_uso || uso.tipo || "",
            area_m2: uso.area_m2 ?? (parseFloat(uso.valor) || null),
          });
        }
      }

      // Re-save coordenadas (delete then insert)
      const coordsArray = coordenadas_utm || coordenadas;
      if (coordsArray && Array.isArray(coordsArray)) {
        await storage.deleteCoordenadas(id);
        for (const coord of coordsArray) {
          await storage.createCoordenada({
            vistoria_id: id,
            tipo: "utm",
            latitude: parseFloat(coord.n) || 0,
            longitude: parseFloat(coord.e) || 0,
            ordem: coord.ordem ?? 0,
          });
        }
      }

      // Re-save fotos (delete then insert)
      if (fotos && Array.isArray(fotos)) {
        await storage.deleteFotos(id);
        for (const foto of fotos) {
          await storage.createFoto({
            vistoria_id: id,
            url_imagem: foto.url_imagem || foto.uri || "",
            legenda: foto.legenda || "",
            ordem: foto.ordem ?? 0,
          });
        }
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
