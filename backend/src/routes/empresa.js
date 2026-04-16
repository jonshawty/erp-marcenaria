const toNull = v => v === undefined ? null : v;
// src/routes/empresa.js — Configurações da empresa
const express = require('express');
const db      = require('../db/database');
const { autenticar, requerPerfil } = require('../middleware/auth');
const router  = express.Router();
router.use(autenticar);

router.get('/',(req,res)=>{
  res.json({...db.prepare('SELECT * FROM empresa LIMIT 1').get()});
});

router.put('/', requerPerfil('admin','gerente'), (req,res)=>{
  const f=req.body;
  db.prepare(`UPDATE empresa SET
    nome=COALESCE(?,nome),cnpj=COALESCE(?,cnpj),telefone=COALESCE(?,telefone),
    email=COALESCE(?,email),endereco=COALESCE(?,endereco),
    pix_chave=COALESCE(?,pix_chave),banco_dados=COALESCE(?,banco_dados),
    cartoes=COALESCE(?,cartoes),boleto_info=COALESCE(?,boleto_info),
    desc_avista=COALESCE(?,desc_avista),juros_10x=COALESCE(?,juros_10x),juros_12x=COALESCE(?,juros_12x),
    atualizado_em=datetime('now') WHERE id=1`
  ).run(f.nome,f.cnpj,f.telefone,f.email,f.endereco,f.pix_chave,f.banco_dados,f.cartoes,f.boleto_info,f.desc_avista,f.juros_10x,f.juros_12x);
  res.json({...db.prepare('SELECT * FROM empresa LIMIT 1').get()});
});

module.exports=router;
