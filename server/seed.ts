import { pool } from "./db";

/**
 * Seeds the database with initial data if it's empty.
 * This runs on every server startup but only inserts data
 * if the 'empresas' table is empty (first boot scenario).
 */
export async function seedIfEmpty(): Promise<void> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) as count FROM empresas");
    if (parseInt(rows[0].count) > 0) {
      return;
    }

    console.log("[seed] Database is empty — seeding initial data...");

    await client.query("BEGIN");

    // 1. Empresas
    await client.query(`
      INSERT INTO empresas (id, nome, cnpj, cor_primaria, cor_secundaria, email_contato, ativa)
      VALUES
        (1, 'Empresa Demo', '00.000.000/0001-00', '#2563eb', '#16a34a', 'contato@empresademo.com.br', true),
        (4, 'EcoBrasil', NULL, '#1A7A52', '#0F5C3B', 'admin@ecobrasil.com.br', true)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval('empresas_id_seq', (SELECT MAX(id) FROM empresas))`);

    // 2. Complexos
    await client.query(`
      INSERT INTO complexos (id, empresa_id, nome, descricao, ativo)
      VALUES
        (2, 4, 'Complexo Juquiá',       'Complexo hidrelétrico do Rio Juquiá - 7 UHEs',   true),
        (3, 4, 'Complexo Sorocaba',     'Complexo hidrelétrico do Rio Sorocaba - 4 UHEs',  true),
        (4, 4, 'Complexo Paranapanema', 'Complexo hidrelétrico do Rio Paranapanema - 2 UHEs', true),
        (5, 4, 'Salto do Rio Verdinho', 'UHE Salto do Rio Verdinho - Goiás',               true)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval('complexos_id_seq', (SELECT MAX(id) FROM complexos))`);

    // 3. Projetos (17 UHEs/PCHs)
    await client.query(`
      INSERT INTO projetos (id, empresa_id, complexo_id, nome, codigo, ativo)
      VALUES
        ( 3, 4, 3, 'UHE Itupararanga',        'UHE-ITP', true),
        ( 4, 4, 4, 'UHE Jurumirim',            'UHE-JRM', true),
        ( 5, 4, 5, 'UHE Salto do Rio Verdinho','UHE-SRV', true),
        ( 6, 4, 4, 'UHE Ourinhos',             'UHE-OUR', true),
        ( 7, 4, 4, 'UHE Piraju',               'UHE-PIR', true),
        ( 8, 4, 4, 'UHE Boa Vista',            'UHE-BOV', true),
        ( 9, 4, 4, 'UHE do Rio Novo',          'UHE-RNV', true),
        (10, 4, 2, 'PCH França',               'PCH-FRA', true),
        (11, 4, 2, 'UHE Fumaça',               'UHE-FUM', true),
        (12, 4, 2, 'UHE Barra',                'UHE-BAR', true),
        (13, 4, 2, 'PCH Porto Raso',           'PCH-PRO', true),
        (14, 4, 2, 'UHE Alecrim',              'UHE-ALC', true),
        (15, 4, 2, 'PCH Serraria',             'PCH-SER', true),
        (16, 4, 2, 'UHE Salto do Iporanga',    'UHE-IPO', true),
        (17, 4, 3, 'CGH Santa Helena',         'CGH-SHE', true),
        (18, 4, 3, 'CGH Votorantim',           'CGH-VOT', true),
        (19, 4, 3, 'PCH Jurupará',             'PCH-JUR', true)
      ON CONFLICT (id) DO NOTHING
    `);
    await client.query(`SELECT setval('projetos_id_seq', (SELECT MAX(id) FROM projetos))`);

    // 4. Admin users (passwords are bcrypt hashes from dev database)
    await client.query(`
      INSERT INTO usuarios (id, nome, email, tipo_usuario, senha_hash, empresa_id, is_admin)
      VALUES
        (
          '4321a3c8-3a30-426d-9a1a-8d167f2b7f49',
          'Admin EcoBrasil',
          'admin@ecobrasil.bio.br',
          'Coordenador',
          '$2b$10$VEtEb5qq2yLvLYz22KY3iu70YENKqQGthJfitJJURIhxYpFqKJ7ES',
          4,
          true
        ),
        (
          '4db01ad7-1f56-4286-8fbc-2127bcdc96ad',
          'Maurivan Vaz Ribeiro',
          'maurivan@ecobrasil.bio.br',
          'Coordenador',
          '$2b$10$/uIRZTctnfrXNuIR3M9mnOmFnF2BnypYaxg70bdeLfEzlTpQnQ0Jy',
          4,
          false
        )
      ON CONFLICT (id) DO NOTHING
    `);

    await client.query("COMMIT");
    console.log("[seed] Initial data seeded successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[seed] Error seeding database:", err);
  } finally {
    client.release();
  }
}
