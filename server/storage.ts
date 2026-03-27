import { db } from "./db";
import { 
  usuarios,
  vistorias,
  coordenadas,
  usosSolo,
  fotos,
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
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUsuario(id: string): Promise<Usuario | undefined>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  
  getVistoria(id: string): Promise<Vistoria | undefined>;
  getVistoriasByUsuario(usuarioId: string): Promise<Vistoria[]>;
  getVistoriasByProjeto(projetoId: number): Promise<Vistoria[]>;
  createVistoria(vistoria: InsertVistoria): Promise<Vistoria>;
  updateVistoria(id: string, updates: Partial<InsertVistoria>): Promise<Vistoria | undefined>;
  deleteVistoria(id: string): Promise<boolean>;
  
  getCoordenadas(vistoriaId: string): Promise<Coordenada[]>;
  createCoordenada(coordenada: InsertCoordenada): Promise<Coordenada>;
  deleteCoordenadas(vistoriaId: string): Promise<boolean>;
  
  getUsosSolo(vistoriaId: string): Promise<UsoSolo[]>;
  createUsoSolo(usoSolo: InsertUsoSolo): Promise<UsoSolo>;
  deleteUsosSolo(vistoriaId: string): Promise<boolean>;
  
  getFotos(vistoriaId: string): Promise<Foto[]>;
  createFoto(foto: InsertFoto): Promise<Foto>;
  deleteFotos(vistoriaId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUsuario(id: string): Promise<Usuario | undefined> {
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, id));
    return usuario;
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return usuario;
  }

  async createUsuario(insertUsuario: InsertUsuario): Promise<Usuario> {
    const [usuario] = await db.insert(usuarios).values(insertUsuario).returning();
    return usuario;
  }

  async getVistoria(id: string): Promise<Vistoria | undefined> {
    const [vistoria] = await db.select().from(vistorias).where(eq(vistorias.id, id));
    return vistoria;
  }

  async getVistoriasByUsuario(usuarioId: string): Promise<Vistoria[]> {
    return db.select().from(vistorias)
      .where(eq(vistorias.usuario_id, usuarioId))
      .orderBy(desc(vistorias.created_at));
  }

  async getVistoriasByProjeto(projetoId: number): Promise<Vistoria[]> {
    return db.select().from(vistorias)
      .where(eq(vistorias.projeto_id, projetoId))
      .orderBy(desc(vistorias.created_at));
  }

  async createVistoria(vistoriaData: InsertVistoria): Promise<Vistoria> {
    const [vistoria] = await db.insert(vistorias).values(vistoriaData).returning();
    return vistoria;
  }

  async updateVistoria(id: string, updates: Partial<InsertVistoria>): Promise<Vistoria | undefined> {
    const [vistoria] = await db.update(vistorias)
      .set(updates)
      .where(eq(vistorias.id, id))
      .returning();
    return vistoria;
  }

  async deleteVistoria(id: string): Promise<boolean> {
    await db.delete(vistorias).where(eq(vistorias.id, id));
    return true;
  }

  async getCoordenadas(vistoriaId: string): Promise<Coordenada[]> {
    return db.select().from(coordenadas).where(eq(coordenadas.vistoria_id, vistoriaId));
  }

  async createCoordenada(coordenadaData: InsertCoordenada): Promise<Coordenada> {
    const [coordenada] = await db.insert(coordenadas).values(coordenadaData).returning();
    return coordenada;
  }

  async deleteCoordenadas(vistoriaId: string): Promise<boolean> {
    await db.delete(coordenadas).where(eq(coordenadas.vistoria_id, vistoriaId));
    return true;
  }

  async getUsosSolo(vistoriaId: string): Promise<UsoSolo[]> {
    return db.select().from(usosSolo).where(eq(usosSolo.vistoria_id, vistoriaId));
  }

  async createUsoSolo(usoSoloData: InsertUsoSolo): Promise<UsoSolo> {
    const [uso] = await db.insert(usosSolo).values(usoSoloData).returning();
    return uso;
  }

  async deleteUsosSolo(vistoriaId: string): Promise<boolean> {
    await db.delete(usosSolo).where(eq(usosSolo.vistoria_id, vistoriaId));
    return true;
  }

  async getFotos(vistoriaId: string): Promise<Foto[]> {
    return db.select().from(fotos).where(eq(fotos.vistoria_id, vistoriaId));
  }

  async createFoto(fotoData: InsertFoto): Promise<Foto> {
    const [foto] = await db.insert(fotos).values(fotoData).returning();
    return foto;
  }

  async deleteFotos(vistoriaId: string): Promise<boolean> {
    await db.delete(fotos).where(eq(fotos.vistoria_id, vistoriaId));
    return true;
  }
}

export const storage = new DatabaseStorage();
