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
/* regras de senha: 8+ caracteres, letras e números (ou símbolos), sem repetir o usuário nem senhas comuns */
const COMUNS = /^(12345678|123456789|senha|password|casahiro|hiro360|qwerty|asdfgh|abc123|admin|mudar|trocar|brasil|iloveyou|bemvindo)/i;
function senhaFraca(senha, usuario) {
  const s = String(senha || '');
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (s.length > 200) return 'Senha muito longa.';
  if (/^\d+$/.test(s)) return 'A senha não pode ser só números.';
  if (!/[a-zà-ú]/i.test(s) || !/[^a-zà-ú]/i.test(s)) return 'A senha precisa misturar letras com números ou símbolos.';
  if (/^(.)\1+$/.test(s) || new Set(s.toLowerCase()).size < 4) return 'A senha repete caracteres demais. Escolha outra.';
  const u = String(usuario || '').toLowerCase();
  if (u && (s.toLowerCase() === u || (u.length >= 4 && s.toLowerCase().includes(u)))) return 'A senha não pode conter o nome de usuário.';
  if (COMUNS.test(s)) return 'Essa senha é muito comum. Escolha outra.';
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
/* verificação em duas etapas (TOTP, RFC 6238): o mesmo código de 6 números do Google/Microsoft Authenticator */
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32(buf) { let bits = 0, v = 0, o = ''; for (const b of buf) { v = (v << 8) | b; bits += 8; while (bits >= 5) { o += B32[(v >>> (bits - 5)) & 31]; bits -= 5; } } if (bits > 0) o += B32[(v << (5 - bits)) & 31]; return o; }
function deBase32(s) { const c = String(s).toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = 0, v = 0; const o = []; for (const ch of c) { v = (v << 5) | B32.indexOf(ch); bits += 5; if (bits >= 8) { o.push((v >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(o); }
const novoSegredo2fa = () => base32(crypto.randomBytes(20));
function totp(segredo, passo) {
  const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(passo));
  const h = crypto.createHmac('sha1', deBase32(segredo)).update(b).digest(); const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1000000)).padStart(6, '0');
}
/* devolve o passo de 30 s aceito (para não aceitar o mesmo código duas vezes) ou null; tolera 30 s de relógio errado */
function confere2fa(segredo, codigo, ultimoPasso, agora = Date.now()) {
  const c = String(codigo || '').replace(/D/g, ''); if (c.length !== 6 || !segredo) return null;
  const p = Math.floor(agora / 30000);
  for (const d of [0, -1, 1]) { const x = p + d; if (x > (ultimoPasso || 0) && crypto.timingSafeEqual(Buffer.from(totp(segredo, x)), Buffer.from(c))) return x; }
  return null;
}
/* códigos de emergência (perdeu o celular): 10 códigos de uso único, guardados só como impressão digital */
const ALF = 'abcdefghjkmnpqrstuvwxyz23456789';
const novosCodigosEmergencia = () => Array.from({ length: 10 }, () => { const b = crypto.randomBytes(8); let t = ''; for (const x of b) t += ALF[x % ALF.length]; return t.slice(0, 4) + '-' + t.slice(4); });
const normCodigo = c => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
module.exports = { novoSegredo2fa, totp, confere2fa, novosCodigosEmergencia, normCodigo, base32, deBase32, hashSenha, confereSenha, senhaFraca, novoToken, hashToken, novoId, usuarioOk, criaLimitador };
