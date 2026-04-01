/**
 * In-memory storage for local development without PostgreSQL.
 * Used automatically when DATABASE_URL is not set.
 */
import type {
  Usuario, InsertUsuario,
  Vistoria, InsertVistoria,
  Coordenada, InsertCoordenada,
  UsoSolo, InsertUsoSolo,
  Foto, InsertFoto,
} from "@shared/schema";
import type { IStorage } from "./storage";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Arquivo de persistência local (sobrevive ao reinicio do servidor)
const DATA_FILE = path.join(process.cwd(), ".vistoria-geo-data.json");

function loadPersistedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("[mem-storage] Falha ao ler dados persistidos:", e);
  }
  return null;
}

function savePersistedData(vistorias: Map<string, any>, coordenadas: Map<string, any>, usosSolo: Map<string, any>, fotos: Map<string, any>) {
  try {
    const payload = {
      vistorias: Object.fromEntries(vistorias),
      coordenadas: Object.fromEntries(coordenadas),
      usosSolo: Object.fromEntries(usosSolo),
      fotos: Object.fromEntries(fotos),
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(payload), "utf-8");
  } catch (e) {
    console.warn("[mem-storage] Falha ao persistir dados:", e);
  }
}

// ─── Dados estáticos de Complexos e UHEs/PCHs ──────────────────────────────
export const COMPLEXOS_DATA = [
  {
    id: 1,
    empresa_id: 4,
    nome: "UHE Salto do Rio Verdinho",
    descricao: "Usina Hidrelétrica Salto do Rio Verdinho",
    ativo: true,
    uhes: [
      { id: 1, complexo_id: 1, nome: "UHE Salto do Rio Verdinho", codigo: "SRV", ativo: true, reservatorio: null, municipios: null },
    ],
  },
  {
    id: 2,
    empresa_id: 4,
    nome: "Complexo Paranapanema e Santa Cruz",
    descricao: "Complexo Paranapanema e Santa Cruz",
    ativo: true,
    uhes: [
      { id: 2, complexo_id: 2, nome: "UHE Ourinhos",    codigo: "OUT", ativo: true, reservatorio: null, municipios: null },
      { id: 3, complexo_id: 2, nome: "UHE Piraju",      codigo: "PIR", ativo: true, reservatorio: null, municipios: null },
      { id: 4, complexo_id: 2, nome: "UHE Boa Vista",   codigo: "BOV", ativo: true, reservatorio: null, municipios: null },
      { id: 5, complexo_id: 2, nome: "UHE do Rio Novo", codigo: "RNO", ativo: true, reservatorio: null, municipios: null },
    ],
  },
  {
    id: 3,
    empresa_id: 4,
    nome: "Complexo Juquiá",
    descricao: "Complexo Juquiá",
    ativo: true,
    uhes: [
      { id: 6,  complexo_id: 3, nome: "PCH França",             codigo: "FRA", ativo: true, reservatorio: null, municipios: null },
      { id: 7,  complexo_id: 3, nome: "UHE Fumaça",             codigo: "FUM", ativo: true, reservatorio: null, municipios: null },
      { id: 8,  complexo_id: 3, nome: "UHE Barra",              codigo: "BAR", ativo: true, reservatorio: null, municipios: null },
      { id: 9,  complexo_id: 3, nome: "PCH Porto Raso",         codigo: "PRS", ativo: true, reservatorio: null, municipios: null },
      { id: 10, complexo_id: 3, nome: "UHE Alecrim",            codigo: "ALE", ativo: true, reservatorio: null, municipios: null },
      { id: 11, complexo_id: 3, nome: "PCH Serraria",           codigo: "SER", ativo: true, reservatorio: null, municipios: null },
      { id: 12, complexo_id: 3, nome: "UHE Salto do Iporanga",  codigo: "SIP", ativo: true, reservatorio: null, municipios: null },
    ],
  },
  {
    id: 4,
    empresa_id: 4,
    nome: "Complexo Sorocaba",
    descricao: "Complexo Sorocaba",
    ativo: true,
    uhes: [
      { id: 13, complexo_id: 4, nome: "UHE Itupararanga", codigo: "ITU", ativo: true, reservatorio: null, municipios: null },
      { id: 14, complexo_id: 4, nome: "CGH Santa Helena",  codigo: "SHE", ativo: true, reservatorio: null, municipios: null },
      { id: 15, complexo_id: 4, nome: "CGH Votorantim",    codigo: "VOT", ativo: true, reservatorio: null, municipios: null },
      { id: 16, complexo_id: 4, nome: "PCH Jurupará",      codigo: "JUR", ativo: true, reservatorio: null, municipios: null },
    ],
  },
];

// Pre-hashed passwords using bcryptjs (same module as server/routes.ts)
// admin123  -> bcryptjs.hash('admin123', 10)
const ADMIN_HASH = "$2b$10$03MOr9zNGCd0ePBmK0ifQelQBn9HDBy3OeNNC7GRdXr99uJCXSa5e";
// maurivan123 -> bcryptjs.hash('maurivan123', 10)
const MAURIVAN_HASH = "$2b$10$rge/YvAViLh/BfI2IhZlE.GcDwttp4fshK3hbTAgbB2W/DXw46LG.";

class MemStorage implements IStorage {
  private usuarios: Map<string, Usuario> = new Map();
  private vistorias: Map<string, Vistoria> = new Map();
  private coordenadas: Map<string, Coordenada> = new Map();
  private usosSolo: Map<string, UsoSolo> = new Map();
  private fotos: Map<string, Foto> = new Map();

  constructor() {
    // Tentar carregar dados persistidos do arquivo
    const persisted = loadPersistedData();
    if (persisted) {
      if (persisted.vistorias) {
        for (const [k, v] of Object.entries(persisted.vistorias)) {
          this.vistorias.set(k, v as Vistoria);
        }
      }
      if (persisted.coordenadas) {
        for (const [k, v] of Object.entries(persisted.coordenadas)) {
          this.coordenadas.set(k, v as Coordenada);
        }
      }
      if (persisted.usosSolo) {
        for (const [k, v] of Object.entries(persisted.usosSolo)) {
          this.usosSolo.set(k, v as UsoSolo);
        }
      }
      if (persisted.fotos) {
        for (const [k, v] of Object.entries(persisted.fotos)) {
          this.fotos.set(k, v as Foto);
        }
      }
      console.log(`[mem-storage] Dados carregados: ${this.vistorias.size} vistoria(s) restaurada(s).`);
    }

    // Seed demo users
    const adminId = "4321a3c8-3a30-426d-9a1a-8d167f2b7f49";
    const maurivanId = "4db01ad7-1f56-4286-8fbc-2127bcdc96ad";

    this.usuarios.set(adminId, {
      id: adminId,
      nome: "Admin EcoBrasil",
      email: "admin@ecobrasil.bio.br",
      tipo_usuario: "Coordenador",
      senha_hash: ADMIN_HASH,
      empresa_id: 4,
      complexo_id: null,
      is_admin: true,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    this.usuarios.set(maurivanId, {
      id: maurivanId,
      nome: "Maurivan Vaz Ribeiro",
      email: "maurivan@ecobrasil.bio.br",
      tipo_usuario: "Coordenador",
      senha_hash: MAURIVAN_HASH,
      empresa_id: 4,
      complexo_id: null,
      is_admin: false,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    } as any);

    console.log("[mem-storage] Running with in-memory storage (no database).");
    console.log("[mem-storage] Demo users:");
    console.log("  admin@ecobrasil.bio.br / admin123");
    console.log("  maurivan@ecobrasil.bio.br / maurivan123");
  }

  async getUsuario(id: string): Promise<Usuario | undefined> {
    return this.usuarios.get(id);
  }

  async updateUsuario(id: string, updates: Partial<Usuario>): Promise<Usuario | undefined> {
    const usuario = this.usuarios.get(id);
    if (!usuario) return undefined;
    const updated = { ...usuario, ...updates, updated_at: new Date() };
    this.usuarios.set(id, updated);
    // Persistir apenas os dados de vistorias (usuários ficam na memória por segurança)
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return updated;
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    for (const u of this.usuarios.values()) {
      if (u.email === email) return u;
    }
    return undefined;
  }

  async createUsuario(data: InsertUsuario): Promise<Usuario> {
    const id = randomUUID();
    const usuario: Usuario = {
      id,
      nome: data.nome,
      email: data.email,
      tipo_usuario: data.tipo_usuario || "Técnico",
      senha_hash: data.senha_hash,
      empresa_id: data.empresa_id ?? null,
      complexo_id: data.complexo_id ?? null,
      is_admin: false,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date(),
    } as any;
    this.usuarios.set(id, usuario);
    return usuario;
  }

  async getVistoria(id: string): Promise<Vistoria | undefined> {
    return this.vistorias.get(id);
  }

  async getVistoriasByUsuario(usuarioId: string): Promise<Vistoria[]> {
    return [...this.vistorias.values()].filter(v => v.usuario_id === usuarioId);
  }

  async getVistoriasByProjeto(projetoId: number): Promise<Vistoria[]> {
    return [...this.vistorias.values()].filter(v => v.projeto_id === projetoId);
  }

  async createVistoria(data: InsertVistoria): Promise<Vistoria> {
    const id = randomUUID();
    const vistoria: Vistoria = {
      id,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    } as any;
    this.vistorias.set(id, vistoria);
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return vistoria;
  }

  async updateVistoria(id: string, updates: Partial<InsertVistoria>): Promise<Vistoria | undefined> {
    const vistoria = this.vistorias.get(id);
    if (!vistoria) return undefined;
    const updated = { ...vistoria, ...updates, updated_at: new Date() };
    this.vistorias.set(id, updated);
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return updated;
  }

  async deleteVistoria(id: string): Promise<boolean> {
    const result = this.vistorias.delete(id);
    // Remover dados associados
    for (const [k, v] of this.coordenadas) { if ((v as any).vistoria_id === id) this.coordenadas.delete(k); }
    for (const [k, v] of this.usosSolo) { if ((v as any).vistoria_id === id) this.usosSolo.delete(k); }
    for (const [k, v] of this.fotos) { if ((v as any).vistoria_id === id) this.fotos.delete(k); }
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return result;
  }

  async getCoordenadas(vistoriaId: string): Promise<Coordenada[]> {
    return [...this.coordenadas.values()].filter(c => c.vistoria_id === vistoriaId);
  }

  async createCoordenada(data: InsertCoordenada): Promise<Coordenada> {
    const id = randomUUID();
    const coordenada: Coordenada = { id: id as any, ...data, created_at: new Date() } as any;
    this.coordenadas.set(id, coordenada);
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return coordenada;
  }

  async deleteCoordenadas(vistoriaId: string): Promise<boolean> {
    for (const [k, v] of this.coordenadas) {
      if (v.vistoria_id === vistoriaId) this.coordenadas.delete(k);
    }
    return true;
  }

  async getUsosSolo(vistoriaId: string): Promise<UsoSolo[]> {
    return [...this.usosSolo.values()].filter(u => u.vistoria_id === vistoriaId);
  }

  async createUsoSolo(data: InsertUsoSolo): Promise<UsoSolo> {
    const id = randomUUID();
    const uso: UsoSolo = { id: id as any, ...data, created_at: new Date() } as any;
    this.usosSolo.set(id, uso);
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return uso;
  }

  async deleteUsosSolo(vistoriaId: string): Promise<boolean> {
    for (const [k, v] of this.usosSolo) {
      if (v.vistoria_id === vistoriaId) this.usosSolo.delete(k);
    }
    return true;
  }

  async getFotos(vistoriaId: string): Promise<Foto[]> {
    return [...this.fotos.values()].filter(f => f.vistoria_id === vistoriaId);
  }

  async createFoto(data: InsertFoto): Promise<Foto> {
    const id = randomUUID();
    const foto: Foto = { id: id as any, ...data, created_at: new Date() } as any;
    this.fotos.set(id, foto);
    savePersistedData(this.vistorias, this.coordenadas, this.usosSolo, this.fotos);
    return foto;
  }

  async deleteFotos(vistoriaId: string): Promise<boolean> {
    for (const [k, v] of this.fotos) {
      if (v.vistoria_id === vistoriaId) this.fotos.delete(k);
    }
    return true;
  }
}

export const memStorage = new MemStorage();
