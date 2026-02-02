import { 
  type Usuario, 
  type InsertUsuario,
  type Vistoria,
  type InsertVistoria,
  type Coordenada,
  type InsertCoordenada,
  type UsoSolo,
  type InsertUsoSolo,
  type Foto,
  type InsertFoto
} from "@shared/schema";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";

export interface IStorage {
  // Usuario
  getUsuario(id: string): Promise<Usuario | undefined>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  
  // Vistoria
  getVistoria(id: string): Promise<Vistoria | undefined>;
  getVistoriasByUsuario(usuarioId: string): Promise<Vistoria[]>;
  createVistoria(vistoria: InsertVistoria): Promise<Vistoria>;
  updateVistoria(id: string, updates: Partial<InsertVistoria>): Promise<Vistoria | undefined>;
  deleteVistoria(id: string): Promise<boolean>;
  
  // Coordenada
  getCoordenadas(vistoriaId: string): Promise<Coordenada[]>;
  createCoordenada(coordenada: InsertCoordenada): Promise<Coordenada>;
  deleteCoordenadas(vistoriaId: string): Promise<boolean>;
  
  // UsoSolo
  getUsosSolo(vistoriaId: string): Promise<UsoSolo[]>;
  createUsoSolo(usoSolo: InsertUsoSolo): Promise<UsoSolo>;
  deleteUsosSolo(vistoriaId: string): Promise<boolean>;
  
  // Foto
  getFotos(vistoriaId: string): Promise<Foto[]>;
  createFoto(foto: InsertFoto): Promise<Foto>;
  deleteFotos(vistoriaId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private usuarios: Map<string, Usuario>;
  private vistorias: Map<string, Vistoria>;
  private coordenadas: Map<string, Coordenada>;
  private usosSolo: Map<string, UsoSolo>;
  private fotos: Map<string, Foto>;

  constructor() {
    this.usuarios = new Map();
    this.vistorias = new Map();
    this.coordenadas = new Map();
    this.usosSolo = new Map();
    this.fotos = new Map();
    
    this.seedDemoUser();
  }

  private async seedDemoUser() {
    const hashedPassword = await bcrypt.hash("123456", 10);
    const demoUser: Usuario = {
      id: randomUUID(),
      nome: "Fiscal Demo",
      email: "demo@mapeia.com",
      tipo_usuario: "Fiscal",
      senha_hash: hashedPassword,
      created_at: new Date(),
    };
    this.usuarios.set(demoUser.id, demoUser);
  }

  // Usuario methods
  async getUsuario(id: string): Promise<Usuario | undefined> {
    return this.usuarios.get(id);
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    return Array.from(this.usuarios.values()).find(
      (usuario) => usuario.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUsuario(insertUsuario: InsertUsuario): Promise<Usuario> {
    const id = randomUUID();
    const usuario: Usuario = { 
      ...insertUsuario, 
      id,
      created_at: new Date(),
    };
    this.usuarios.set(id, usuario);
    return usuario;
  }

  // Vistoria methods
  async getVistoria(id: string): Promise<Vistoria | undefined> {
    return this.vistorias.get(id);
  }

  async getVistoriasByUsuario(usuarioId: string): Promise<Vistoria[]> {
    return Array.from(this.vistorias.values())
      .filter((v) => v.usuario_id === usuarioId)
      .sort((a, b) => {
        const dateA = new Date(a.data_vistoria).getTime();
        const dateB = new Date(b.data_vistoria).getTime();
        return dateB - dateA;
      });
  }

  async createVistoria(insertVistoria: InsertVistoria): Promise<Vistoria> {
    const id = randomUUID();
    const vistoria: Vistoria = {
      ...insertVistoria,
      id,
      created_at: new Date(),
    };
    this.vistorias.set(id, vistoria);
    return vistoria;
  }

  async updateVistoria(id: string, updates: Partial<InsertVistoria>): Promise<Vistoria | undefined> {
    const existing = this.vistorias.get(id);
    if (!existing) return undefined;
    
    const updated: Vistoria = { ...existing, ...updates };
    this.vistorias.set(id, updated);
    return updated;
  }

  async deleteVistoria(id: string): Promise<boolean> {
    return this.vistorias.delete(id);
  }

  // Coordenada methods
  async getCoordenadas(vistoriaId: string): Promise<Coordenada[]> {
    return Array.from(this.coordenadas.values())
      .filter((c) => c.vistoria_id === vistoriaId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  async createCoordenada(insertCoordenada: InsertCoordenada): Promise<Coordenada> {
    const id = randomUUID();
    const coordenada: Coordenada = { ...insertCoordenada, id };
    this.coordenadas.set(id, coordenada);
    return coordenada;
  }

  async deleteCoordenadas(vistoriaId: string): Promise<boolean> {
    for (const [key, coord] of this.coordenadas) {
      if (coord.vistoria_id === vistoriaId) {
        this.coordenadas.delete(key);
      }
    }
    return true;
  }

  // UsoSolo methods
  async getUsosSolo(vistoriaId: string): Promise<UsoSolo[]> {
    return Array.from(this.usosSolo.values())
      .filter((u) => u.vistoria_id === vistoriaId);
  }

  async createUsoSolo(insertUsoSolo: InsertUsoSolo): Promise<UsoSolo> {
    const id = randomUUID();
    const usoSolo: UsoSolo = { ...insertUsoSolo, id };
    this.usosSolo.set(id, usoSolo);
    return usoSolo;
  }

  async deleteUsosSolo(vistoriaId: string): Promise<boolean> {
    for (const [key, uso] of this.usosSolo) {
      if (uso.vistoria_id === vistoriaId) {
        this.usosSolo.delete(key);
      }
    }
    return true;
  }

  // Foto methods
  async getFotos(vistoriaId: string): Promise<Foto[]> {
    return Array.from(this.fotos.values())
      .filter((f) => f.vistoria_id === vistoriaId)
      .sort((a, b) => a.ordem - b.ordem);
  }

  async createFoto(insertFoto: InsertFoto): Promise<Foto> {
    const id = randomUUID();
    const foto: Foto = { ...insertFoto, id };
    this.fotos.set(id, foto);
    return foto;
  }

  async deleteFotos(vistoriaId: string): Promise<boolean> {
    for (const [key, foto] of this.fotos) {
      if (foto.vistoria_id === vistoriaId) {
        this.fotos.delete(key);
      }
    }
    return true;
  }
}

export const storage = new MemStorage();
