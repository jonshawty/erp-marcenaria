// src/middleware/auth.js
// Middleware de autenticação JWT

const jwt = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET  || 'erp_marcenaria_secret_2026_mude_em_producao';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// Gera token
function gerarToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Middleware — verifica token em todas as rotas protegidas
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ erro: 'Token de acesso obrigatório' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    return res.status(403).json({ erro: 'Token inválido' });
  }
}

// Middleware — verifica perfil (admin ou gerente)
function requerPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: `Acesso negado. Requer perfil: ${perfis.join(' ou ')}`
      });
    }
    next();
  };
}

module.exports = { gerarToken, autenticar, requerPerfil };
