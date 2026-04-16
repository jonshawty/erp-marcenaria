// src/server.js — ERP Marcenaria · Backend Refatorado v2
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');
const fs         = require('fs');

const authRoutes       = require('./routes/auth');
const orcamentosRoutes = require('./routes/orcamentos');
const clientesRoutes   = require('./routes/clientes');
const empresaRoutes    = require('./routes/empresa');
const usuariosRoutes   = require('./routes/usuarios');

const app  = express();
const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));

const ORIGENS_PERMITIDAS = (
  process.env.CORS_ORIGINS ||
  'http://localhost:3001,http://127.0.0.1:3001,http://localhost:5500,http://127.0.0.1:5500'
)
.split(',')
.map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    if (ORIGENS_PERMITIDAS.includes(origin)) {
      return cb(null, true);
    }

    console.log('⛔ CORS bloqueado:', origin);
    return cb(new Error(`CORS: origem não permitida — ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use(rateLimit({ windowMs: 15*60*1000, max: 500, standardHeaders: true, legacyHeaders: false,
  message: { erro: 'Muitas requisições.' } }));
app.use('/api/auth/login', rateLimit({ windowMs: 10*60*1000, max: 20,
  message: { erro: 'Muitas tentativas de login.' } }));

// Serve frontend estático
const FRONTEND_DIR = path.join(__dirname, '../../frontend');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

// API routes
app.use('/api/auth',       authRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/clientes',   clientesRoutes);
app.use('/api/empresa',    empresaRoutes);
app.use('/api/usuarios',   usuariosRoutes);

app.get('/api', (req, res) => res.json({
  sistema:'ERP Marcenaria', versao:'2.0.0', status:'online',
  ambiente: process.env.NODE_ENV || 'development',
}));

// SPA fallback
app.get(/^(?!\/api).*/, (req, res) => {
  const idx = path.join(FRONTEND_DIR, '/index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  res.status(404).json({ erro: 'Coloque o frontend em /frontend/index.html' });
});

app.use((err, req, res, next) => {
  console.error('❌', err.message);
  res.status(err.status||500).json({
    erro: err.message||'Erro interno',
    detalhe: process.env.NODE_ENV==='development' ? err.stack : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`\n🪵  ERP Marcenaria v2.0`);
  console.log(`    http://localhost:${PORT}         ← Frontend`);
  console.log(`    http://localhost:${PORT}/api     ← API\n`);
});

module.exports = app;
