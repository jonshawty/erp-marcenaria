const toNull = v => v === undefined ? null : v;
// src/routes/usuarios.js — Gerenciamento de usuários (admin)
const express = require('express');
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
const { autenticar, requerPerfil } = require('../middleware/auth');
const router  = express.Router();
router.use(autenticar, requerPerfil('admin'));

const toObj=r=>r?{...r}:null;
const FIELDS='id,nome,email,perfil,ativo,criado_em';

router.get('/',(req,res)=>{ res.json(db.prepare(`SELECT ${FIELDS} FROM usuarios ORDER BY nome`).all().map(r=>({...r}))); });

router.post('/',(req,res)=>{
  const{nome,email,senha,perfil='vendedor'}=req.body;
  if(!nome||!email||!senha) return res.status(400).json({erro:'Nome, email e senha são obrigatórios'});
  if(senha.length<6) return res.status(400).json({erro:'Senha deve ter ≥ 6 caracteres'});
  if(!['admin','gerente','vendedor'].includes(perfil)) return res.status(400).json({erro:'Perfil inválido'});
  if(db.prepare('SELECT id FROM usuarios WHERE email=?').get(email)) return res.status(409).json({erro:'E-mail já cadastrado'});
  const r=db.prepare(`INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)`).run(nome.trim(),email.toLowerCase().trim(),bcrypt.hashSync(senha,10),perfil);
  res.status(201).json(toObj(db.prepare(`SELECT ${FIELDS} FROM usuarios WHERE id=?`).get(r.lastInsertRowid)));
});

router.put('/:id',(req,res)=>{
  if(!db.prepare('SELECT id FROM usuarios WHERE id=?').get(req.params.id)) return res.status(404).json({erro:'Usuário não encontrado'});
  const{nome,email,perfil,ativo}=req.body;
  db.prepare(`UPDATE usuarios SET nome=COALESCE(?,nome),email=COALESCE(?,email),perfil=COALESCE(?,perfil),ativo=COALESCE(?,ativo),atualizado_em=datetime('now') WHERE id=?`).run(nome,email,perfil,ativo!=null?(ativo?1:0):null,req.params.id);
  res.json(toObj(db.prepare(`SELECT ${FIELDS} FROM usuarios WHERE id=?`).get(req.params.id)));
});

router.delete('/:id',(req,res)=>{
  if(parseInt(req.params.id)===req.usuario.id) return res.status(400).json({erro:'Não pode excluir seu próprio usuário'});
  if(!db.prepare('SELECT id FROM usuarios WHERE id=?').get(req.params.id)) return res.status(404).json({erro:'Usuário não encontrado'});
  db.prepare('DELETE FROM usuarios WHERE id=?').run(req.params.id);
  res.json({mensagem:'Usuário excluído'});
});

module.exports=router;
