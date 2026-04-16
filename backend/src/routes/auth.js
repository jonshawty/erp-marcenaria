// src/routes/auth.js
// Rotas de autenticação

const express  = require('express');
const bcrypt   = require('bcryptjs');
const db       = require('../db/database');
const { gerarToken, autenticar } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
  }

  const usuario = db.prepare(`
    SELECT id, nome, email, senha_hash, perfil, ativo
    FROM usuarios WHERE email = ? LIMIT 1
  `).get(email.toLowerCase().trim());

  if (!usuario) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  if (!usuario.ativo) {
    return res.status(403).json({ erro: 'Usuário inativo. Contate o administrador.' });
  }

  const senhaOk = bcrypt.compareSync(senha, usuario.senha_hash);
  if (!senhaOk) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const payload = {
    id:     usuario.id,
    nome:   usuario.nome,
    email:  usuario.email,
    perfil: usuario.perfil,
  };

  const token = gerarToken(payload);

  res.json({
    token,
    usuario: payload,
    expira_em: '8h',
  });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', autenticar, (req, res) => {
  const usuario = db.prepare(`
    SELECT id, nome, email, perfil, ativo, criado_em
    FROM usuarios WHERE id = ?
  `).get(req.usuario.id);

  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  res.json(usuario);
});

// ── PUT /api/auth/senha ────────────────────────────────────────────────────
router.put('/senha', autenticar, (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
  }
  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'Nova senha deve ter pelo menos 6 caracteres' });
  }

  const usuario = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
  if (!bcrypt.compareSync(senha_atual, usuario.senha_hash)) {
    return res.status(401).json({ erro: 'Senha atual incorreta' });
  }

  const novoHash = bcrypt.hashSync(nova_senha, 10);
  db.prepare(`
    UPDATE usuarios SET senha_hash = ?, atualizado_em = datetime('now') WHERE id = ?
  `).run(novoHash, req.usuario.id);

  res.json({ mensagem: 'Senha alterada com sucesso' });
});

module.exports = router;
