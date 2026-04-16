const toNull = v => v === undefined ? null : v;
// src/routes/clientes.js — CRUD de clientes
const express = require('express');
const db      = require('../db/database');
const { autenticar } = require('../middleware/auth');
const router  = express.Router();
router.use(autenticar);

const toObj = r => r ? {...r} : null;
const toArr = r => r.map(x=>({...x}));

router.get('/', (req,res)=>{
  const {busca,pagina=1,limite=30}=req.query;
  const pp=Math.min(parseInt(limite)||30,100);
  const off=(Math.max(parseInt(pagina)||1,1)-1)*pp;
  let where=['1=1'],params=[];
  if(busca){where.push('(nome LIKE ? OR cpf_cnpj LIKE ? OR email LIKE ?)');const q=`%${busca}%`;params.push(q,q,q);}
  const total=db.prepare(`SELECT COUNT(*) as n FROM clientes WHERE ${where.join(' AND ')}`).get(...params).n;
  const dados=toArr(db.prepare(`SELECT * FROM clientes WHERE ${where.join(' AND ')} ORDER BY nome ASC LIMIT ? OFFSET ?`).all(...params,pp,off));
  res.json({dados,paginacao:{total,pagina:parseInt(pagina)||1,por_pagina:pp,paginas:Math.ceil(total/pp)}});
});

router.get('/:id',(req,res)=>{
  const c=toObj(db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id));
  if(!c) return res.status(404).json({erro:'Cliente não encontrado'});
  const orcs=toArr(db.prepare('SELECT id,tipo_projeto,data_orc,status,venda_final,lucro FROM orcamentos WHERE cliente_nome=? ORDER BY data_orc DESC').all(c.nome));
  res.json({...c,orcamentos:orcs});
});

router.post('/',(req,res)=>{
  const{nome,cpf_cnpj='',telefone='',email='',endereco='',cidade='',estado='',observacoes=''}=req.body;
  if(!nome?.trim()) return res.status(400).json({erro:'Nome é obrigatório'});
  const r=db.prepare(`INSERT INTO clientes (nome,cpf_cnpj,telefone,email,endereco,cidade,estado,observacoes) VALUES (?,?,?,?,?,?,?,?)`).run(nome.trim(),cpf_cnpj,telefone,email,endereco,cidade,estado,observacoes);
  res.status(201).json(toObj(db.prepare('SELECT * FROM clientes WHERE id=?').get(r.lastInsertRowid)));
});

router.put('/:id',(req,res)=>{
  if(!db.prepare('SELECT id FROM clientes WHERE id=?').get(req.params.id)) return res.status(404).json({erro:'Cliente não encontrado'});
  const{nome,cpf_cnpj,telefone,email,endereco,cidade,estado,observacoes}=req.body;
  db.prepare(`UPDATE clientes SET nome=COALESCE(?,nome),cpf_cnpj=COALESCE(?,cpf_cnpj),telefone=COALESCE(?,telefone),email=COALESCE(?,email),endereco=COALESCE(?,endereco),cidade=COALESCE(?,cidade),estado=COALESCE(?,estado),observacoes=COALESCE(?,observacoes),atualizado_em=datetime('now') WHERE id=?`).run(nome,cpf_cnpj,telefone,email,endereco,cidade,estado,observacoes,req.params.id);
  res.json(toObj(db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id)));
});

router.delete('/:id',(req,res)=>{
  if(!db.prepare('SELECT id FROM clientes WHERE id=?').get(req.params.id)) return res.status(404).json({erro:'Cliente não encontrado'});
  db.prepare('DELETE FROM clientes WHERE id=?').run(req.params.id);
  res.json({mensagem:'Cliente excluído'});
});

module.exports=router;
