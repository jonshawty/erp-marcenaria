/**
 * api.js — Camada de comunicação com o backend ERP Marcenaria
 * Gerencia: token JWT, fetch autenticado, fallback offline via localStorage
 */

const API_BASE = (() => {
  // Se estiver rodando via file://, aponta para o backend local
  if (location.protocol === 'file:') return 'http://localhost:3001/api';
  // Se o frontend for servido pelo próprio backend, usa origin relativo
  return `${location.origin}/api`;
})();

const TOKEN_KEY = 'erp_jwt_token';
const USER_KEY  = 'erp_usuario';

// ─── Token ────────────────────────────────────────────
export function getToken()   { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }

export function getUsuario() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
export function setUsuario(u) { localStorage.setItem(USER_KEY, JSON.stringify(u)); }

export function estaAutenticado() {
  const t = getToken();
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload.exp > Date.now() / 1000;
  } catch { return false; }
}

// ─── Fetch autenticado ────────────────────────────────
async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...opts.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    clearToken();
    location.href = `${location.origin}/login.html`;
    throw new Error('Sessão expirada');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.erro || `Erro ${res.status}`), { status: res.status, data });
  return data;
}

// ─── Auth ─────────────────────────────────────────────
export async function login(email, senha) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
  setToken(data.token);
  setUsuario(data.usuario);
  return data;
}

export function logout() {
  clearToken();
  location.href = `${location.origin}/login.html`;
}

export async function getMe() {
  return apiFetch('/auth/me');
}

// ─── Orçamentos ───────────────────────────────────────
export async function listarOrcamentos(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/orcamentos${qs ? '?' + qs : ''}`);
}

export async function getOrcamento(id) {
  return apiFetch(`/orcamentos/${id}`);
}

export async function criarOrcamento(dados) {
  return apiFetch('/orcamentos', { method: 'POST', body: JSON.stringify(dados) });
}

export async function atualizarOrcamento(id, dados) {
  return apiFetch(`/orcamentos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export async function alterarStatusOrcamento(id, status, observacao = '') {
  return apiFetch(`/orcamentos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, observacao }),
  });
}

export async function excluirOrcamento(id) {
  return apiFetch(`/orcamentos/${id}`, { method: 'DELETE' });
}

export async function getEstatisticas(ano) {
  return apiFetch(`/orcamentos/estatisticas${ano ? '?ano=' + ano : ''}`);
}

// exportarCSV: usa fetch com Authorization header (token não fica na URL)
// O arquivo é baixado via Blob, sem expor o token no histórico do navegador
export async function exportarCSV(params = {}) {
  const token = getToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/orcamentos/exportar${qs ? '?' + qs : ''}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error('Falha ao exportar CSV');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orcamentos-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Empresa ──────────────────────────────────────────
export async function getEmpresa() {
  return apiFetch('/empresa');
}

// ─── Clientes ─────────────────────────────────────────
export async function listarClientes(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`/clientes${qs ? '?' + qs : ''}`);
}

// ─── Health check (detecta se backend está online) ────
export async function backendOnline() {
  try {
    const r = await fetch(`${API_BASE}`, { signal: AbortSignal.timeout(2000) });
    return r.ok;
  } catch { return false; }
}
