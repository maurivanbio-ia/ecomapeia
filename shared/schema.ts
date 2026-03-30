import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, date, timestamp, serial, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// MULTI-TENANT ARCHITECTURE - Empresas e Projetos
// ==========================================

// Empresas (Companies) table
export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj").unique(),
  logo_url: text("logo_url"),
  cor_primaria: text("cor_primaria").default("#2563eb"),
  cor_secundaria: text("cor_secundaria").default("#16a34a"),
  endereco: text("endereco"),
  telefone: text("telefone"),
  email_contato: text("email_contato"),
  ativa: boolean("ativa").default(true),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEmpresaSchema = createInsertSchema(empresas).pick({
  nome: true,
  cnpj: true,
  logo_url: true,
  cor_primaria: true,
  cor_secundaria: true,
  endereco: true,
  telefone: true,
  email_contato: true,
});

export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;
export type Empresa = typeof empresas.$inferSelect;

// Complexos table - agrupamento de UHEs por complexo hidrelétrico
export const complexos = pgTable("complexos", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").references(() => empresas.id).notNull(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").default(true),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertComplexoSchema = createInsertSchema(complexos).pick({
  empresa_id: true,
  nome: true,
  descricao: true,
});

export type InsertComplexo = z.infer<typeof insertComplexoSchema>;
export type Complexo = typeof complexos.$inferSelect;

// Projetos (Projects) table - cada projeto é uma UHE, pertence a um complexo
export const projetos = pgTable("projetos", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").references(() => empresas.id).notNull(),
  complexo_id: integer("complexo_id").references(() => complexos.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  codigo: text("codigo"), // Ex: "UHE-ITP", "UHE-JRM"
  localizacao: text("localizacao"),
  area_km2: real("area_km2"),
  reservatorio: text("reservatorio"), // Nome do reservatório
  rio_principal: text("rio_principal"),
  municipios: text("municipios"), // Lista de municípios
  ativo: boolean("ativo").default(true),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertProjetoSchema = createInsertSchema(projetos).pick({
  empresa_id: true,
  complexo_id: true,
  nome: true,
  descricao: true,
  codigo: true,
  localizacao: true,
  area_km2: true,
  reservatorio: true,
  rio_principal: true,
  municipios: true,
});

export type InsertProjeto = z.infer<typeof insertProjetoSchema>;
export type Projeto = typeof projetos.$inferSelect;

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

// Usuario table - com vinculação à empresa
export const usuarios = pgTable("usuarios", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  tipo_usuario: text("tipo_usuario").notNull().default("Fiscal"),
  senha_hash: text("senha_hash").notNull(),
  empresa_id: integer("empresa_id").references(() => empresas.id),
  complexo_id: integer("complexo_id").references(() => complexos.id),
  is_admin: boolean("is_admin").default(false),
  projeto_atual_id: integer("projeto_atual_id").references(() => projetos.id),
  avatar_url: text("avatar_url"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertUsuarioSchema = createInsertSchema(usuarios).pick({
  nome: true,
  email: true,
  tipo_usuario: true,
  senha_hash: true,
  empresa_id: true,
  complexo_id: true,
  is_admin: true,
});

export type InsertUsuario = z.infer<typeof insertUsuarioSchema>;
export type Usuario = typeof usuarios.$inferSelect;

// Vistoria table - Based on UHE Itupararanga cadastramento format
export const vistorias = pgTable("vistorias", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  usuario_id: varchar("usuario_id").notNull().references(() => usuarios.id),
  projeto_id: integer("projeto_id").references(() => projetos.id), // Vinculação ao projeto
  numero_notificacao: text("numero_notificacao"),
  setor: text("setor"),
  margem: text("margem"),
  municipio: text("municipio"),
  numero_confrontante: text("numero_confrontante"),
  proprietario: text("proprietario").notNull(),
  loteamento_condominio: text("loteamento_condominio"),
  tipo_inspecao: text("tipo_inspecao").notNull().default("CADASTRAMENTO"),
  data_vistoria: date("data_vistoria").notNull(),
  comodatario: text("comodatario"),
  contrato_vigente: text("contrato_vigente"),
  zona_utm: text("zona_utm"),
  coord_utm_e_inicial: text("coord_utm_e_inicial"),
  coord_utm_s_inicial: text("coord_utm_s_inicial"),
  coord_utm_e_final: text("coord_utm_e_final"),
  coord_utm_s_final: text("coord_utm_s_final"),
  deteccao: text("deteccao").default("VISTORIA IN LOCO"),
  tipo_intervencao: text("tipo_intervencao"),
  intervencao: text("intervencao"),
  detalhamento_intervencao: text("detalhamento_intervencao"),
  emissao_notificacao: text("emissao_notificacao"),
  reincidente: text("reincidente"),
  objetivo_notificacao: text("objetivo_notificacao"),
  plano_acao: text("plano_acao"),
  acao: text("acao"),
  status_acao: text("status_acao"),
  observacoes: text("observacoes"),
  croqui_imagem: text("croqui_imagem"),
  assinatura_uri: text("assinatura_uri"),
  assinatura_tecnico_uri: text("assinatura_tecnico_uri"),
  pdf_gerado_url: text("pdf_gerado_url"),
  status_upload: text("status_upload").notNull().default("offline"),
  created_at: timestamp("created_at").defaultNow(),
  // Environmental compliance fields
  car_info: jsonb("car_info"),
  embargo_check: jsonb("embargo_check"),
  compliance_analysis: jsonb("compliance_analysis"),
  uc_info: jsonb("uc_info"),
  // Weather and time fields
  hora_vistoria: text("hora_vistoria"),
  weather_data: jsonb("weather_data"),
  // GPS tracking field
  track_points: jsonb("track_points"),
});

export const insertVistoriaSchema = createInsertSchema(vistorias).pick({
  usuario_id: true,
  projeto_id: true,
  numero_notificacao: true,
  setor: true,
  margem: true,
  municipio: true,
  numero_confrontante: true,
  proprietario: true,
  loteamento_condominio: true,
  tipo_inspecao: true,
  data_vistoria: true,
  comodatario: true,
  contrato_vigente: true,
  zona_utm: true,
  coord_utm_e_inicial: true,
  coord_utm_s_inicial: true,
  coord_utm_e_final: true,
  coord_utm_s_final: true,
  deteccao: true,
  tipo_intervencao: true,
  intervencao: true,
  detalhamento_intervencao: true,
  emissao_notificacao: true,
  reincidente: true,
  objetivo_notificacao: true,
  plano_acao: true,
  acao: true,
  status_acao: true,
  observacoes: true,
  croqui_imagem: true,
  assinatura_uri: true,
  assinatura_tecnico_uri: true,
  pdf_gerado_url: true,
  status_upload: true,
  car_info: true,
  embargo_check: true,
  compliance_analysis: true,
  uc_info: true,
  hora_vistoria: true,
  weather_data: true,
  track_points: true,
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
  coordenada: jsonb("coordenada"),
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
  tipo_usuario: z.enum(["Fiscal", "Técnico", "Coordenador", "Gerente"]).default("Fiscal"),
  complexo_id: z.number().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Teams table for team management - vinculada à empresa
export const equipes = pgTable("equipes", {
  id: serial("id").primaryKey(),
  empresa_id: integer("empresa_id").references(() => empresas.id),
  projeto_id: integer("projeto_id").references(() => projetos.id),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  responsavel_id: varchar("responsavel_id").references(() => usuarios.id),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertEquipeSchema = createInsertSchema(equipes).pick({
  empresa_id: true,
  projeto_id: true,
  nome: true,
  descricao: true,
  responsavel_id: true,
});

export type InsertEquipe = z.infer<typeof insertEquipeSchema>;
export type Equipe = typeof equipes.$inferSelect;

// Team members junction table
export const membros_equipe = pgTable("membros_equipe", {
  id: serial("id").primaryKey(),
  equipe_id: integer("equipe_id").references(() => equipes.id).notNull(),
  usuario_id: varchar("usuario_id").references(() => usuarios.id).notNull(),
  role: text("role").default("membro"),
  joined_at: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type MembroEquipe = typeof membros_equipe.$inferSelect;

// Notifications table
export const notificacoes = pgTable("notificacoes", {
  id: serial("id").primaryKey(),
  usuario_id: varchar("usuario_id").references(() => usuarios.id).notNull(),
  titulo: text("titulo").notNull(),
  mensagem: text("mensagem").notNull(),
  tipo: text("tipo").default("info"), // info, warning, success, error
  lida: integer("lida").default(0),
  vistoria_id: varchar("vistoria_id").references(() => vistorias.id),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNotificacaoSchema = createInsertSchema(notificacoes).pick({
  usuario_id: true,
  titulo: true,
  mensagem: true,
  tipo: true,
  vistoria_id: true,
});

export type InsertNotificacao = z.infer<typeof insertNotificacaoSchema>;
export type Notificacao = typeof notificacoes.$inferSelect;

// Vistoria assignment table (for team task assignment)
export const atribuicoes_vistoria = pgTable("atribuicoes_vistoria", {
  id: serial("id").primaryKey(),
  vistoria_id: varchar("vistoria_id").references(() => vistorias.id).notNull(),
  usuario_id: varchar("usuario_id").references(() => usuarios.id).notNull(),
  atribuido_por: varchar("atribuido_por").references(() => usuarios.id),
  prazo: date("prazo"),
  status: text("status").default("pendente"), // pendente, em_andamento, concluida
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type AtribuicaoVistoria = typeof atribuicoes_vistoria.$inferSelect;

// Videos table for video recording feature
export const videos = pgTable("videos", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  vistoria_id: varchar("vistoria_id").references(() => vistorias.id).notNull(),
  uri: text("uri").notNull(),
  duracao: real("duracao"), // duration in seconds
  legenda: text("legenda"),
  ordem: integer("ordem").default(1),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertVideoSchema = createInsertSchema(videos).pick({
  vistoria_id: true,
  uri: true,
  duracao: true,
  legenda: true,
  ordem: true,
});

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

// Weather conditions for inspection
export const condicoes_climaticas = pgTable("condicoes_climaticas", {
  id: serial("id").primaryKey(),
  vistoria_id: varchar("vistoria_id").references(() => vistorias.id).notNull(),
  temperatura: real("temperatura"),
  umidade: real("umidade"),
  precipitacao: real("precipitacao"),
  vento: real("vento"),
  descricao: text("descricao"),
  captured_at: timestamp("captured_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type CondicaoClimatica = typeof condicoes_climaticas.$inferSelect;

// Password Resets table - 6-digit codes for password recovery
export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  created_at: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export type PasswordReset = typeof passwordResets.$inferSelect;
