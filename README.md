# 🪵 ERP Marcenaria — v2.0 Refatorado

Sistema completo de orçamentos para marcenaria com **Backend REST + Frontend integrado**.

---

## Estrutura do Projeto

```
erp5-marcenaria/
├── backend/
│   ├── src/
│   │   ├── server.js          ← Servidor Express (serve API + frontend)
│   │   ├── db/
│   │   │   ├── database.js    ← SQLite (node:sqlite nativo, Node 22+)
│   │   │   └── seed.js        ← Dados de demonstração
│   │   ├── middleware/
│   │   │   └── auth.js        ← JWT autenticação
│   │   └── routes/
│   │       ├── auth.js        ← POST /login, GET /me, PUT /senha
│   │       ├── orcamentos.js  ← CRUD completo + status + stats + CSV
│   │       ├── clientes.js    ← CRUD de clientes
│   │       ├── empresa.js     ← Config da empresa
│   │       └── usuarios.js    ← Gerenciamento de usuários
│   ├── .env                   ← Variáveis de ambiente
│   └── package.json
├── frontend/
│   ├── index.html             ← App principal (integrado com API)
│   └── login.html             ← Tela de login JWT
└── data/
    └── erp_marcenaria.db      ← Banco SQLite (criado automaticamente)
```

---

## Requisitos

- **Node.js 22+** (usa `node:sqlite` nativo)
- npm

---

## Como rodar

### 1. Instalar dependências
```bash
cd backend
npm install
```

### 2. Configurar ambiente
```bash
cp .env.example .env
# Edite .env se necessário (porta, JWT secret)
```

### 3. Popular banco com dados de demo
```bash
npm run seed
```

### 4. Iniciar servidor
```bash
npm start          # produção
# ou
npm run dev        # desenvolvimento com --watch (auto-reload)
```

### 5. Abrir no navegador
```
http://localhost:3001
```

---

## Usuários de demonstração

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@madeirarte.com.br | admin123 | Admin |
| carlos@madeirarte.com.br | gerente123 | Gerente |
| ana@madeirarte.com.br | vendas123 | Vendedor |

---

## Endpoints da API

```
POST   /api/auth/login                  Login → retorna JWT
GET    /api/auth/me                     Dados do usuário logado
PUT    /api/auth/senha                  Alterar senha

GET    /api/orcamentos                  Listar (filtros, paginação, busca)
POST   /api/orcamentos                  Criar orçamento
GET    /api/orcamentos/estatisticas     Stats por ano
GET    /api/orcamentos/exportar         Download CSV
GET    /api/orcamentos/:id              Detalhes + itens + histórico
PUT    /api/orcamentos/:id              Atualizar
PATCH  /api/orcamentos/:id/status       Mudar status
DELETE /api/orcamentos/:id              Excluir (admin/gerente)

GET    /api/clientes                    Listar clientes
POST   /api/clientes                    Criar cliente
GET    /api/clientes/:id                Detalhes + orçamentos do cliente
PUT    /api/clientes/:id                Atualizar
DELETE /api/clientes/:id               Excluir

GET    /api/empresa                     Dados da empresa
PUT    /api/empresa                     Atualizar (admin/gerente)

GET    /api/usuarios                    Listar (admin)
POST   /api/usuarios                    Criar usuário (admin)
PUT    /api/usuarios/:id                Atualizar (admin)
DELETE /api/usuarios/:id               Excluir (admin)
```

---

## Integração Frontend ↔ Backend

### Fluxo de autenticação
1. Usuário acessa `/` → redirecionado para `/login.html` se não autenticado
2. Login via `POST /api/auth/login` → token JWT salvo no `localStorage`
3. Todas as requisições incluem `Authorization: Bearer <token>`
4. Token expirado → redireciona para login automaticamente

### Modo offline
- Se o backend estiver **offline**, o frontend opera com `localStorage`
- Badge **"⚠ Local"** indica orçamentos não sincronizados
- Badge **"✓ API"** confirma dados sincronizados com o servidor

### Dados da empresa automáticos
- Ao carregar, o frontend busca `/api/empresa` e preenche automaticamente os campos de pagamento (PIX, banco, parcelas)

---

## Scripts disponíveis

```bash
npm start    # node --experimental-sqlite src/server.js
npm run dev  # com --watch (auto-reload em desenvolvimento)
npm run seed # popula banco com dados de demonstração
npm run reset # apaga banco + popula novamente
```

---

## Variáveis de ambiente (.env)

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=sua_chave_super_secreta_aqui
JWT_EXPIRES=8h
```
