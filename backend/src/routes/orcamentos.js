// src/routes/orcamentos.js — CRUD completo + status + stats + export + CSV

const express = require('express');
const db      = require('../db/database');
const { autenticar, requerPerfil } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// ── HELPERS ────────────────────────────────────────────────────────────────
function gerarId() {
  const ano = new Date().getFullYear();
  const ultimo = db.prepare(`SELECT id FROM orcamentos WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`ORC-${ano}-%`);
  let seq = 1;
  if (ultimo) seq = parseInt(ultimo.id.split('-')[2]) + 1;
  return `ORC-${ano}-${String(seq).padStart(4,'0')}`;
}

function validar(body) {
  const e = [];
  if (!body.cliente_nome?.trim()) e.push('cliente_nome é obrigatório');
  if (!body.data_orc) e.push('data_orc é obrigatório');
  return e;
}

// Convert undefined values to null for SQLite binding
function toNull(v) { return v === undefined ? null : v; }

function toObj(row) {
  // node:sqlite retorna null-prototype objects — converte para plain object
  return row ? { ...row } : null;
}

function toArr(rows) { return rows.map(toObj); }

// ── GET /api/orcamentos ─────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { status, busca, pagina=1, limite=20, data_inicio, data_fim, ordenar='criado_em', direcao='DESC' } = req.query;
  const pp  = Math.min(parseInt(limite)||20, 100);
  const off = (Math.max(parseInt(pagina)||1, 1) - 1) * pp;
  const cols_ok = ['criado_em','data_orc','cliente_nome','venda_final','status','custo_total'];
  const col = cols_ok.includes(ordenar) ? ordenar : 'criado_em';
  const dir = direcao.toUpperCase()==='ASC' ? 'ASC' : 'DESC';

  let where = ['1=1'], params = [];
  if (status && status!=='todos') { where.push('status=?'); params.push(status); }
  if (busca) {
    where.push('(cliente_nome LIKE ? OR id LIKE ? OR tipo_projeto LIKE ? OR responsavel LIKE ?)');
    const q=`%${busca}%`; params.push(q,q,q,q);
  }
  if (data_inicio) { where.push('data_orc>=?'); params.push(data_inicio); }
  if (data_fim)    { where.push('data_orc<=?'); params.push(data_fim); }

  const whereStr = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as n FROM orcamentos WHERE ${whereStr}`).get(...params).n;
  const dados = toArr(db.prepare(`SELECT * FROM orcamentos WHERE ${whereStr} ORDER BY ${col} ${dir} LIMIT ? OFFSET ?`).all(...params, pp, off));

  res.json({ dados, paginacao:{ total, pagina:parseInt(pagina)||1, por_pagina:pp, paginas:Math.ceil(total/pp) } });
});

// ── GET /api/orcamentos/estatisticas ───────────────────────────────────────
router.get('/estatisticas', (req, res) => {
  const ano = req.query.ano || new Date().getFullYear();

  const stats = toObj(db.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status='aberto'    THEN 1 END) as abertos,
      COUNT(CASE WHEN status='fechado'   THEN 1 END) as fechados,
      COUNT(CASE WHEN status='enviado'   THEN 1 END) as enviados,
      COUNT(CASE WHEN status='cancelado' THEN 1 END) as cancelados,
      COALESCE(SUM(CASE WHEN status='fechado' THEN venda_final END),0) as faturamento,
      COALESCE(SUM(CASE WHEN status='fechado' THEN lucro END),0)       as lucro_total,
      COALESCE(AVG(CASE WHEN status='fechado' THEN venda_final END),0) as ticket_medio,
      COALESCE(AVG(CASE WHEN status='fechado' THEN margem_pct END),0)  as margem_media
    FROM orcamentos WHERE strftime('%Y',criado_em)=?
  `).get(String(ano)));

  const por_mes = toArr(db.prepare(`
    SELECT strftime('%Y-%m',data_orc) as mes,
           COUNT(*) as total,
           COALESCE(SUM(CASE WHEN status='fechado' THEN venda_final END),0) as faturamento,
           COALESCE(SUM(CASE WHEN status='fechado' THEN lucro END),0)       as lucro
    FROM orcamentos
    WHERE data_orc >= date('now','-12 months')
    GROUP BY mes ORDER BY mes ASC
  `).all());

  const por_tipo = toArr(db.prepare(`
    SELECT tipo_projeto, COUNT(*) as total,
           COALESCE(SUM(venda_final),0) as faturamento
    FROM orcamentos WHERE status='fechado' AND strftime('%Y',criado_em)=?
    GROUP BY tipo_projeto ORDER BY faturamento DESC LIMIT 10
  `).all(String(ano)));

  res.json({ ...stats, por_mes, por_tipo });
});

// ── GET /api/orcamentos/exportar ───────────────────────────────────────────
// Autenticação: aceita Bearer header (padrão) ou ?_token=... (fallback download)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'erp_marcenaria_secret_2026_mude_em_producao';

router.get('/exportar', (req, res) => {
  // Valida token via header OU via query (necessário para download direto no browser)
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query._token) {
    token = req.query._token;
  }
  if (!token) return res.status(401).json({ erro: 'Token de acesso obrigatório' });
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ erro: 'Token inválido ou expirado' });
  }
  const { status, data_inicio, data_fim } = req.query;
  let where=['1=1'], params=[];
  if (status&&status!=='todos') { where.push('status=?'); params.push(status); }
  if (data_inicio) { where.push('data_orc>=?'); params.push(data_inicio); }
  if (data_fim)    { where.push('data_orc<=?'); params.push(data_fim); }

  const rows = toArr(db.prepare(`SELECT * FROM orcamentos WHERE ${where.join(' AND ')} ORDER BY criado_em DESC`).all(...params));

  const cab = ['ID','Cliente','Tipo','Responsável','Data','Prazo','Status',
    'Custo Total','Venda Final','Lucro','Margem%',
    'MDF','Ferragens','Acessórios','Corte','Furação','Fita','Montagem','Frete','Projeto',
    'Criado em'];

  const csv = '\uFEFF' + [
    cab.join(','),
    ...rows.map(r=>[
      r.id,r.cliente_nome,r.tipo_projeto,r.responsavel,r.data_orc,r.prazo_dias,r.status,
      (r.custo_total||0).toFixed(2),(r.venda_final||0).toFixed(2),(r.lucro||0).toFixed(2),
      (r.margem_pct||0).toFixed(1),
      r.custo_mdf,r.custo_ferr,r.custo_acess,r.custo_corte,r.custo_furacao,
      r.custo_fita,r.custo_montagem,r.custo_frete,r.custo_projeto,r.criado_em
    ].map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))
  ].join('\n');

  const nome = `orcamentos-${new Date().toISOString().split('T')[0]}.csv`;
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition',`attachment;filename="${nome}"`);
  res.send(csv);
});

// ── GET /api/orcamentos/:id ─────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const orc = toObj(db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id));
  if (!orc) return res.status(404).json({ erro:'Orçamento não encontrado' });

  const itens = toArr(db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id=? ORDER BY categoria,id').all(req.params.id));
  const historico = toArr(db.prepare(`
    SELECT h.*, u.nome as usuario_nome
    FROM orcamento_historico h
    LEFT JOIN usuarios u ON u.id=h.usuario_id
    WHERE h.orcamento_id=? ORDER BY h.criado_em DESC
  `).all(req.params.id));

  res.json({ ...orc, itens, historico });
});

// ── POST /api/orcamentos ───────────────────────────────────────────────────
router.post('/', (req, res) => {
  const erros = validar(req.body);
  if (erros.length) return res.status(400).json({ erro:erros.join('; ') });

  const {
    id:idFront, cliente_nome, tipo_projeto='', responsavel='',
    data_orc, prazo_dias=30, observacoes='',
    custo_mdf=0,custo_ferr=0,custo_acess=0,custo_corte=0,custo_furacao=0,
    custo_fita=0,custo_montagem=0,custo_frete=0,custo_projeto=0,
    custo_total=0,comissao_pct=0,comissao_val=0,margem_pct=50,
    venda_sugerida=0,venda_final=0,lucro=0,
    pgto_desc_avista=5,pgto_juros_10x=8,pgto_juros_12x=12,
    pgto_pix='',pgto_banco='',pgto_cartao='',pgto_boleto='',
    itens=[],
  } = req.body;

  const id = (idFront && /^ORC-\d{4}-\d{3,}$/.test(idFront)) ? idFront : gerarId();
  if (db.prepare('SELECT id FROM orcamentos WHERE id=?').get(id)) {
    return res.status(409).json({ erro:`ID ${id} já existe. Use PUT para atualizar.` });
  }

  db.prepare(`BEGIN`).run();
  try {
    db.prepare(`
      INSERT INTO orcamentos
        (id,cliente_nome,tipo_projeto,responsavel,usuario_id,data_orc,prazo_dias,
         status,observacoes,custo_mdf,custo_ferr,custo_acess,custo_corte,custo_furacao,
         custo_fita,custo_montagem,custo_frete,custo_projeto,custo_total,
         comissao_pct,comissao_val,margem_pct,venda_sugerida,venda_final,lucro,
         pgto_desc_avista,pgto_juros_10x,pgto_juros_12x,pgto_pix,pgto_banco,pgto_cartao,pgto_boleto)
      VALUES (?,?,?,?,?,?,?,'aberto',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(id,cliente_nome.trim(),tipo_projeto,responsavel,req.usuario.id,data_orc,prazo_dias,
           observacoes,custo_mdf,custo_ferr,custo_acess,custo_corte,custo_furacao,
           custo_fita,custo_montagem,custo_frete,custo_projeto,custo_total,
           comissao_pct,comissao_val,margem_pct,venda_sugerida,venda_final,lucro,
           pgto_desc_avista,pgto_juros_10x,pgto_juros_12x,pgto_pix,pgto_banco,pgto_cartao,pgto_boleto);

    const insItem = db.prepare(`INSERT INTO orcamento_itens (orcamento_id,categoria,descricao,quantidade,valor_unit,total) VALUES (?,?,?,?,?,?)`);
    for (const it of itens) {
      if (it.descricao?.trim()) {
        const qty = parseFloat(it.quantidade)||1, vu = parseFloat(it.valor_unit)||0;
        insItem.run(id, it.categoria||'mdf', it.descricao.trim(), qty, vu, qty*vu);
      }
    }

    db.prepare(`INSERT INTO orcamento_historico (orcamento_id,usuario_id,status_antes,status_depois,observacao) VALUES (?,?,null,'aberto','Orçamento criado')`).run(id,req.usuario.id);
    db.prepare('COMMIT').run();
  } catch(e) {
    db.prepare('ROLLBACK').run();
    throw e;
  }

  res.status(201).json(toObj(db.prepare('SELECT * FROM orcamentos WHERE id=?').get(id)));
});

// ── PUT /api/orcamentos/:id ─────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const orc = toObj(db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id));
  if (!orc) return res.status(404).json({ erro:'Orçamento não encontrado' });

  const merged = { ...orc, ...req.body };
  const erros = validar(merged);
  if (erros.length) return res.status(400).json({ erro:erros.join('; ') });

  const f = req.body;
  db.prepare('BEGIN').run();
  try {
    db.prepare(`
      UPDATE orcamentos SET
        cliente_nome=COALESCE(?,cliente_nome), tipo_projeto=COALESCE(?,tipo_projeto),
        responsavel=COALESCE(?,responsavel),   data_orc=COALESCE(?,data_orc),
        prazo_dias=COALESCE(?,prazo_dias),     observacoes=COALESCE(?,observacoes),
        custo_mdf=COALESCE(?,custo_mdf),       custo_ferr=COALESCE(?,custo_ferr),
        custo_acess=COALESCE(?,custo_acess),   custo_corte=COALESCE(?,custo_corte),
        custo_furacao=COALESCE(?,custo_furacao),custo_fita=COALESCE(?,custo_fita),
        custo_montagem=COALESCE(?,custo_montagem),custo_frete=COALESCE(?,custo_frete),
        custo_projeto=COALESCE(?,custo_projeto),custo_total=COALESCE(?,custo_total),
        comissao_pct=COALESCE(?,comissao_pct), comissao_val=COALESCE(?,comissao_val),
        margem_pct=COALESCE(?,margem_pct),     venda_sugerida=COALESCE(?,venda_sugerida),
        venda_final=COALESCE(?,venda_final),   lucro=COALESCE(?,lucro),
        pgto_desc_avista=COALESCE(?,pgto_desc_avista),
        pgto_juros_10x=COALESCE(?,pgto_juros_10x),
        pgto_juros_12x=COALESCE(?,pgto_juros_12x),
        pgto_pix=COALESCE(?,pgto_pix),         pgto_banco=COALESCE(?,pgto_banco),
        pgto_cartao=COALESCE(?,pgto_cartao),   pgto_boleto=COALESCE(?,pgto_boleto),
        atualizado_em=datetime('now')
      WHERE id=?
    `).run(
      toNull(f.cliente_nome),toNull(f.tipo_projeto),toNull(f.responsavel),toNull(f.data_orc),toNull(f.prazo_dias),toNull(f.observacoes),
      toNull(f.custo_mdf),toNull(f.custo_ferr),toNull(f.custo_acess),toNull(f.custo_corte),toNull(f.custo_furacao),
      toNull(f.custo_fita),toNull(f.custo_montagem),toNull(f.custo_frete),toNull(f.custo_projeto),toNull(f.custo_total),
      toNull(f.comissao_pct),toNull(f.comissao_val),toNull(f.margem_pct),toNull(f.venda_sugerida),toNull(f.venda_final),toNull(f.lucro),
      toNull(f.pgto_desc_avista),toNull(f.pgto_juros_10x),toNull(f.pgto_juros_12x),
      toNull(f.pgto_pix),toNull(f.pgto_banco),toNull(f.pgto_cartao),toNull(f.pgto_boleto),
      req.params.id
    );

    if (Array.isArray(f.itens)) {
      db.prepare('DELETE FROM orcamento_itens WHERE orcamento_id=?').run(req.params.id);
      const insItem = db.prepare(`INSERT INTO orcamento_itens (orcamento_id,categoria,descricao,quantidade,valor_unit,total) VALUES (?,?,?,?,?,?)`);
      for (const it of f.itens) {
        if (it.descricao?.trim()) {
          const qty=parseFloat(it.quantidade)||1, vu=parseFloat(it.valor_unit)||0;
          insItem.run(req.params.id,it.categoria||'mdf',it.descricao.trim(),qty,vu,qty*vu);
        }
      }
    }

    db.prepare('COMMIT').run();
  } catch(e) { db.prepare('ROLLBACK').run(); throw e; }

  res.json(toObj(db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id)));
});

// ── PATCH /api/orcamentos/:id/status ──────────────────────────────────────
router.patch('/:id/status', (req, res) => {
  const { status, observacao='' } = req.body;
  const validos = ['aberto','fechado','enviado','cancelado'];
  if (!validos.includes(status)) return res.status(400).json({ erro:`Status inválido. Use: ${validos.join(', ')}` });

  const orc = toObj(db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id));
  if (!orc) return res.status(404).json({ erro:'Orçamento não encontrado' });

  let extra = '';
  if (status==='enviado' && !orc.enviado_em) extra = ",enviado_em=datetime('now')";
  if (status==='fechado' && !orc.fechado_em) extra = ",fechado_em=datetime('now')";

  db.prepare(`UPDATE orcamentos SET status=?,atualizado_em=datetime('now')${extra} WHERE id=?`).run(status,req.params.id);
  db.prepare(`INSERT INTO orcamento_historico (orcamento_id,usuario_id,status_antes,status_depois,observacao) VALUES (?,?,?,?,?)`).run(req.params.id,req.usuario.id,orc.status,status,observacao);

  res.json({ id:req.params.id, status, mensagem:`Status → ${status}` });
});

// ── DELETE /api/orcamentos/:id ─────────────────────────────────────────────
router.delete('/:id', requerPerfil('admin','gerente'), (req, res) => {
  const orc = db.prepare('SELECT id FROM orcamentos WHERE id=?').get(req.params.id);
  if (!orc) return res.status(404).json({ erro:'Orçamento não encontrado' });

  db.prepare('DELETE FROM orcamento_itens    WHERE orcamento_id=?').run(req.params.id);
  db.prepare('DELETE FROM orcamento_historico WHERE orcamento_id=?').run(req.params.id);
  db.prepare('DELETE FROM orcamentos WHERE id=?').run(req.params.id);

  res.json({ mensagem:`Orçamento ${req.params.id} excluído` });
});

module.exports = router;
