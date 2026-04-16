// src/db/database.js
// Conexão SQLite usando better-sqlite3
// API síncrona — compatível com o restante do projeto

const Database = require('better-sqlite3');
const path = require('path');
const fs   = require('fs');

const DB_PATH =
  process.env.DB_PATH ||
  path.join(__dirname, '../../../data/erp_marcenaria.db');

const DB_DIR = path.dirname(DB_PATH);

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

// ═══════════════════════════════════════════════════════
// SCHEMA COMPLETO
// ═══════════════════════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    senha_hash    TEXT    NOT NULL,
    perfil        TEXT    NOT NULL DEFAULT 'vendedor',
    ativo         INTEGER NOT NULL DEFAULT 1,
    criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS empresa (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT DEFAULT 'MadeirArte Marcenaria',
    cnpj          TEXT DEFAULT '',
    telefone      TEXT DEFAULT '',
    email         TEXT DEFAULT '',
    endereco      TEXT DEFAULT '',
    logo_url      TEXT DEFAULT '',
    pix_chave     TEXT DEFAULT '',
    banco_dados   TEXT DEFAULT '',
    cartoes       TEXT DEFAULT 'Visa / Master / Elo',
    boleto_info   TEXT DEFAULT 'Vencimento D+3',
    desc_avista   REAL DEFAULT 5.0,
    juros_10x     REAL DEFAULT 8.0,
    juros_12x     REAL DEFAULT 12.0,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nome          TEXT NOT NULL,
    cpf_cnpj      TEXT DEFAULT '',
    telefone      TEXT DEFAULT '',
    email         TEXT DEFAULT '',
    endereco      TEXT DEFAULT '',
    cidade        TEXT DEFAULT '',
    estado        TEXT DEFAULT '',
    observacoes   TEXT DEFAULT '',
    criado_em     TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamentos (
    id               TEXT PRIMARY KEY,
    cliente_id       INTEGER,
    usuario_id       INTEGER,
    cliente_nome     TEXT NOT NULL,
    tipo_projeto     TEXT NOT NULL DEFAULT '',
    responsavel      TEXT DEFAULT '',
    data_orc         TEXT NOT NULL,
    prazo_dias       INTEGER DEFAULT 30,
    status           TEXT NOT NULL DEFAULT 'aberto',
    custo_mdf        REAL DEFAULT 0,
    custo_ferr       REAL DEFAULT 0,
    custo_acess      REAL DEFAULT 0,
    custo_corte      REAL DEFAULT 0,
    custo_furacao    REAL DEFAULT 0,
    custo_fita       REAL DEFAULT 0,
    custo_montagem   REAL DEFAULT 0,
    custo_frete      REAL DEFAULT 0,
    custo_projeto    REAL DEFAULT 0,
    custo_total      REAL DEFAULT 0,
    comissao_pct     REAL DEFAULT 0,
    comissao_val     REAL DEFAULT 0,
    margem_pct       REAL DEFAULT 50,
    venda_sugerida   REAL DEFAULT 0,
    venda_final      REAL DEFAULT 0,
    lucro            REAL DEFAULT 0,
    pgto_desc_avista REAL DEFAULT 5,
    pgto_juros_10x   REAL DEFAULT 8,
    pgto_juros_12x   REAL DEFAULT 12,
    pgto_pix         TEXT DEFAULT '',
    pgto_banco       TEXT DEFAULT '',
    pgto_cartao      TEXT DEFAULT '',
    pgto_boleto      TEXT DEFAULT '',
    enviado_em       TEXT,
    fechado_em       TEXT,
    observacoes      TEXT DEFAULT '',
    criado_em        TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamento_itens (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id  TEXT NOT NULL,
    categoria     TEXT NOT NULL DEFAULT 'mdf',
    descricao     TEXT NOT NULL,
    quantidade    REAL NOT NULL DEFAULT 1,
    valor_unit    REAL NOT NULL DEFAULT 0,
    total         REAL NOT NULL DEFAULT 0,
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orcamento_historico (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    orcamento_id  TEXT NOT NULL,
    usuario_id    INTEGER,
    status_antes  TEXT,
    status_depois TEXT NOT NULL,
    observacao    TEXT DEFAULT '',
    criado_em     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_orc_status    ON orcamentos(status);
  CREATE INDEX IF NOT EXISTS idx_orc_criado    ON orcamentos(criado_em DESC);
  CREATE INDEX IF NOT EXISTS idx_orc_data      ON orcamentos(data_orc DESC);
  CREATE INDEX IF NOT EXISTS idx_itens_orc     ON orcamento_itens(orcamento_id);
  CREATE INDEX IF NOT EXISTS idx_hist_orc      ON orcamento_historico(orcamento_id);
  CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);
`);

// Empresa padrão
const empresaExiste = db.prepare('SELECT id FROM empresa LIMIT 1').get();
if (!empresaExiste) {
  db.prepare(`INSERT INTO empresa (nome) VALUES ('MadeirArte Marcenaria')`).run();
}

console.log(`✅ Banco de dados: ${DB_PATH}`);
module.exports = db;