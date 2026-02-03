import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// AI Chat - Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

// AI Chat - Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Usuario table
export const usuarios = pgTable("usuarios", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  tipo_usuario: text("tipo_usuario").notNull().default("Fiscal"),
  senha_hash: text("senha_hash").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUsuarioSchema = createInsertSchema(usuarios).pick({
  nome: true,
  email: true,
  tipo_usuario: true,
  senha_hash: true,
});

export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuarios.$inferSelect;

// Vistoria table
export const vistorias = pgTable("vistorias", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  usuario_id: varchar("usuario_id").notNull().references(() => usuarios.id),
  nome_propriedade: text("nome_propriedade").notNull(),
  data_vistoria: date("data_vistoria").notNull(),
  observacoes: text("observacoes"),
  croqui_imagem: text("croqui_imagem"),
  pdf_gerado_url: text("pdf_gerado_url"),
  status_upload: text("status_upload").notNull().default("offline"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertVistoriaSchema = createInsertSchema(vistorias).pick({
  usuario_id: true,
  nome_propriedade: true,
  data_vistoria: true,
  observacoes: true,
  croqui_imagem: true,
  pdf_gerado_url: true,
  status_upload: true,
});

export type InsertVistoria = z.infer<typeof insertVistoriaSchema>;
export type Vistoria = typeof vistorias.$inferSelect;

// Coordenada table
export const coordenadas = pgTable("coordenadas", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vistoria_id: varchar("vistoria_id").notNull().references(() => vistorias.id),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  ordem: integer("ordem").notNull(),
});

export const insertCoordenadaSchema = createInsertSchema(coordenadas).pick({
  vistoria_id: true,
  latitude: true,
  longitude: true,
  ordem: true,
});

export type InsertCoordenada = z.infer<typeof insertCoordenadaSchema>;
export type Coordenada = typeof coordenadas.$inferSelect;

// UsoSolo table
export const usosSolo = pgTable("usos_solo", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vistoria_id: varchar("vistoria_id").notNull().references(() => vistorias.id),
  tipo_uso: text("tipo_uso").notNull(),
  area_m2: real("area_m2"),
});

export const insertUsoSoloSchema = createInsertSchema(usosSolo).pick({
  vistoria_id: true,
  tipo_uso: true,
  area_m2: true,
});

export type InsertUsoSolo = z.infer<typeof insertUsoSoloSchema>;
export type UsoSolo = typeof usosSolo.$inferSelect;

// Foto table
export const fotos = pgTable("fotos", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vistoria_id: varchar("vistoria_id").notNull().references(() => vistorias.id),
  url_imagem: text("url_imagem").notNull(),
  legenda: text("legenda"),
  ordem: integer("ordem").notNull(),
});

export const insertFotoSchema = createInsertSchema(fotos).pick({
  vistoria_id: true,
  url_imagem: true,
  legenda: true,
  ordem: true,
});

export type InsertFoto = z.infer<typeof insertFotoSchema>;
export type Foto = typeof fotos.$inferSelect;

// Login schemas
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  tipo_usuario: z.enum(["Fiscal", "Técnico"]).default("Fiscal"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
