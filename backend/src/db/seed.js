// src/db/seed.js — Seed completo
const db     = require('./database');
const bcrypt = require('bcryptjs');

console.log('\n🌱 Seed iniciado...\n');

// ── USUÁRIOS ──────────────────────────────────────────
const usuarios = [
  { nome:'Administrador',   email:'admin@madeirarte.com.br',  senha:'admin123',   perfil:'admin'   },
  { nome:'Carlos Gerente',  email:'carlos@madeirarte.com.br', senha:'gerente123', perfil:'gerente' },
  { nome:'Ana Vendedora',   email:'ana@madeirarte.com.br',    senha:'vendas123',  perfil:'vendedor'},
];
const insUser = db.prepare(`INSERT OR IGNORE INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)`);
for (const u of usuarios) {
  insUser.run(u.nome, u.email, bcrypt.hashSync(u.senha,10), u.perfil);
  console.log(`  👤 ${u.email} / ${u.senha} [${u.perfil}]`);
}

// ── EMPRESA ───────────────────────────────────────────
db.prepare(`UPDATE empresa SET
  nome='MadeirArte Marcenaria', cnpj='12.345.678/0001-99',
  telefone='(11) 3000-0000', email='contato@madeirarte.com.br',
  endereco='Rua das Madeiras, 500 — Mooca · São Paulo / SP',
  pix_chave='12.345.678/0001-99', banco_dados='Ag. 0001 · CC 12345-6 · Itaú',
  cartoes='Visa / Master / Elo / Amex', boleto_info='Vencimento D+3 úteis',
  desc_avista=5.0, juros_10x=8.0, juros_12x=12.0 WHERE id=1`).run();
console.log('\n  🏭 Empresa configurada');

// ── CLIENTES ──────────────────────────────────────────
const insCli = db.prepare(`INSERT OR IGNORE INTO clientes (nome,cpf_cnpj,telefone,email,endereco,cidade,estado) VALUES (?,?,?,?,?,?,?)`);
const clientes = [
  ['Maria Oliveira',   '000.111.222-33','(11)98888-1111','maria@email.com',   'Rua das Flores, 142','São Paulo','SP'],
  ['João Carlos Silva','111.222.333-44','(11)97777-2222','joao@email.com',    'Av. Paulista, 1000', 'São Paulo','SP'],
  ['Empresa ABC Ltda', '22.333.444/0001-55','(11)3000-5555','compras@abc.com','Rua Industrial, 200','Guarulhos','SP'],
];
for (const c of clientes) { insCli.run(...c); console.log(`  👥 ${c[0]}`); }

// ── ORÇAMENTOS ────────────────────────────────────────
const insOrc = db.prepare(`INSERT OR IGNORE INTO orcamentos
  (id,cliente_nome,tipo_projeto,responsavel,data_orc,prazo_dias,status,
   custo_mdf,custo_ferr,custo_acess,custo_corte,custo_furacao,
   custo_fita,custo_montagem,custo_frete,custo_projeto,
   custo_total,margem_pct,venda_final,lucro,enviado_em,fechado_em,
   pgto_pix,pgto_banco,pgto_cartao,pgto_boleto)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const orcs = [
  ['ORC-2026-0001','Maria Oliveira','Cozinha Planejada','Carlos Gerente','2026-01-15',35,'fechado',
   1345,625,216,350,180,120,1200,300,400,4736,80,8524.80,3788.80,null,'2026-01-20T10:00:00.000Z',
   '12.345.678/0001-99','Ag. 0001 · Itaú','Visa / Master / Elo','D+3'],
  ['ORC-2026-0002','João Carlos Silva','Guarda-Roupa + Closet','Ana Vendedora','2026-02-01',25,'enviado',
   900,450,180,250,120,80,900,200,300,3380,75,5915,2535,'2026-02-05T14:30:00.000Z',null,
   '12.345.678/0001-99','Ag. 0001 · Itaú','Visa / Master / Elo','D+3'],
  ['ORC-2026-0003','Empresa ABC Ltda','Escritório Corporativo','Carlos Gerente','2026-02-20',45,'aberto',
   2200,1100,480,600,350,200,2400,500,800,8630,70,14671,6041,null,null,
   '12.345.678/0001-99','Ag. 0001 · Itaú','Visa / Master / Elo','D+3'],
  ['ORC-2026-0004','Maria Oliveira','Lavanderia','Ana Vendedora','2026-03-05',20,'cancelado',
   450,220,80,120,60,40,500,150,200,1820,60,2912,1092,null,null,
   '12.345.678/0001-99','Ag. 0001 · Itaú','Visa / Master / Elo','D+3'],
];
for (const o of orcs) { insOrc.run(...o); console.log(`  📋 ${o[0]} — ${o[1]} [${o[6]}]`); }

// ── ITENS ─────────────────────────────────────────────
const insItem = db.prepare(`INSERT INTO orcamento_itens (orcamento_id,categoria,descricao,quantidade,valor_unit,total) VALUES (?,?,?,?,?,?)`);
const itens = [
  ['ORC-2026-0001','mdf',      'Chapa MDF 15mm — Estrutural',15,89.90,15*89.90],
  ['ORC-2026-0001','mdf',      'Chapa MDF 6mm — Fundo',       6,52.00,6*52.00],
  ['ORC-2026-0001','ferragem', 'Dobradiça amortecida Blum',  20,12.50,20*12.50],
  ['ORC-2026-0001','ferragem', 'Corrediça telescópica 45cm', 10,28.00,10*28.00],
  ['ORC-2026-0001','ferragem', 'Parafusos (lote)',             1,35.00,35.00],
  ['ORC-2026-0001','acessorio','Puxador alumínio 128mm',      12,18.00,12*18.00],
  ['ORC-2026-0002','mdf',      'Chapa MDF 15mm — Estrutural',10,89.90,10*89.90],
  ['ORC-2026-0002','ferragem', 'Dobradiça amortecida Blum',  16,12.50,16*12.50],
  ['ORC-2026-0002','acessorio','Puxador inox slim',           10,18.00,10*18.00],
];
// Clear existing items for seed idempotency
db.prepare("DELETE FROM orcamento_itens WHERE orcamento_id IN ('ORC-2026-0001','ORC-2026-0002')").run();
for (const it of itens) { insItem.run(...it); }
console.log(`\n  📦 ${itens.length} itens criados`);

// ── HISTÓRICO ─────────────────────────────────────────
db.prepare("DELETE FROM orcamento_historico WHERE orcamento_id LIKE 'ORC-2026-%'").run();
const insHist = db.prepare(`INSERT INTO orcamento_historico (orcamento_id,status_antes,status_depois,observacao) VALUES (?,?,?,?)`);
insHist.run('ORC-2026-0001',null,'aberto','Orçamento criado');
insHist.run('ORC-2026-0001','aberto','enviado','Proposta enviada ao cliente');
insHist.run('ORC-2026-0001','enviado','fechado','Cliente aprovou — contrato assinado');
insHist.run('ORC-2026-0002',null,'aberto','Orçamento criado');
insHist.run('ORC-2026-0002','aberto','enviado','Proposta enviada por e-mail');
insHist.run('ORC-2026-0003',null,'aberto','Orçamento criado');
insHist.run('ORC-2026-0004',null,'aberto','Orçamento criado');
insHist.run('ORC-2026-0004','aberto','cancelado','Cliente desistiu do projeto');

console.log('\n✅ Seed concluído!\n');
console.log('─────────────────────────────────────────────');
console.log('  admin@madeirarte.com.br   / admin123   [Admin]');
console.log('  carlos@madeirarte.com.br  / gerente123 [Gerente]');
console.log('  ana@madeirarte.com.br     / vendas123  [Vendedor]');
console.log('─────────────────────────────────────────────\n');
