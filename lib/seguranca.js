'use strict';
const crypto = require('crypto');

/* senha: scrypt com sal. formato: scrypt$N$salhex$hashhex */
const N = 16384;
function hashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(senha), sal, 64, { N, r: 8, p: 1 });
  return `scrypt$${N}$${sal.toString('hex')}$${h.toString('hex')}`;
}
function confereSenha(senha, guardado) {
  try {
    const [t, n, sal, h] = String(guardado).split('$');
    if (t !== 'scrypt') return false;
    const calc = crypto.scryptSync(String(senha), Buffer.from(sal, 'hex'), 64, { N: +n, r: 8, p: 1 });
    const esp = Buffer.from(h, 'hex');
    return calc.length === esp.length && crypto.timingSafeEqual(calc, esp);
  } catch (e) { return false; }
}
/* regras de senha: 8+ caracteres, não pode ser só números nem igual ao usuário */
function senhaFraca(senha, usuario) {
  const s = String(senha || '');
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (s.length > 200) return 'Senha muito longa.';
  if (/^\d+$/.test(s)) return 'A senha não pode ser só números.';
  if (usuario && s.toLowerCase() === String(usuario).toLowerCase()) return 'A senha não pode ser igual ao usuário.';
  if (/^(12345678|senha123|password|casahiro|qwertyui)/i.test(s)) return 'Essa senha é muito comum. Escolha outra.';
  return null;
}
const novoToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = t => crypto.createHash('sha256').update(String(t)).digest('hex');
const novoId = (p = 'u') => p + '_' + crypto.randomBytes(8).toString('hex');
const usuarioOk = u => /^[a-z0-9._-]{3,40}$/.test(u);

/* bloqueio por tentativas erradas: 5 erros => 15 minutos (por usuário e por IP) */
function criaLimitador({ max = 5, janelaMs = 15 * 60 * 1000 } = {}) {
  const m = new Map();
  const limpa = (k, agora) => { const e = m.get(k); if (e && agora - e.t > janelaMs) m.delete(k); return m.get(k); };
  return {
    bloqueado(k, agora = Date.now()) { const e = limpa(k, agora); return !!(e && e.n >= max) ? Math.ceil((janelaMs - (agora - e.t)) / 60000) : 0; },
    falha(k, agora = Date.now()) { const e = limpa(k, agora) || { n: 0, t: agora }; e.n++; e.t = agora; m.set(k, e); },
    ok(k) { m.delete(k); },
    tam: () => m.size,
  };
}
module.exports = { hashSenha, confereSenha, senhaFraca, novoToken, hashToken, novoId, usuarioOk, criaLimitador };
