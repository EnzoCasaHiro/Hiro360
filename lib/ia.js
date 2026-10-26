'use strict';
/* Leitura de notas e classificação por IA (API da Anthropic). A chave fica SÓ no servidor (.env). */
const https = require('https');

const MODELOS = env => ({
  quick: env.ANTHROPIC_MODEL_QUICK || 'claude-haiku-5-5',
  default: env.ANTHROPIC_MODEL_DEFAULT || 'claude-sonnet-5-5',
  complex: env.ANTHROPIC_MODEL_COMPLEX || 'claude-opus-5-5',
});

function chama(env, corpo, { fetchImpl } = {}) {
  const url = env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
  const payload = JSON.stringify(corpo);
  if (fetchImpl) return fetchImpl(url, payload);
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = https.request({ method: 'POST', hostname: u.hostname, port: u.port || 443, path: u.pathname, timeout: 120000,
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-length': Buffer.byteLength(payload) } }, r => {
      const b = []; r.on('data', d => b.push(d));
      r.on('end', () => { let j = null; try { j = JSON.parse(Buffer.concat(b).toString('utf8')); } catch (e) {} res({ status: r.statusCode, json: j }); });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', rej); req.end(payload);
  });
}

/* tira cercas ```json e devolve o primeiro objeto/array JSON do texto */
function extraiJson(texto) {
  let t = String(texto || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.search(/[\[{]/); if (a < 0) throw new Error('A resposta da IA não trouxe JSON.');
  const abre = t[a], fecha = abre === '{' ? '}' : ']';
  for (let z = t.lastIndexOf(fecha); z > a; z = t.lastIndexOf(fecha, z - 1)) { try { return JSON.parse(t.slice(a, z + 1)); } catch (e) {} }
  throw new Error('A resposta da IA não estava em JSON válido.');
}

async function lerJson(env, { prompt, images, tier }, opts = {}) {
  if (!env.ANTHROPIC_API_KEY && !opts.fetchImpl) { const e = new Error('A leitura por IA não está configurada no servidor.'); e.code = 'ia_off'; throw e; }
  const modelo = MODELOS(env)[tier] || MODELOS(env).default;
  const content = [];
  for (const im of (images || []).slice(0, 4)) content.push({ type: 'image', source: { type: 'base64', media_type: im.type, data: im.data } });
  content.push({ type: 'text', text: String(prompt) });
  const r = await chama(env, { model: modelo, max_tokens: tier === 'quick' ? 4096 : 8192, messages: [{ role: 'user', content }] }, opts);
  if (r.status === 429) { const e = new Error('Limite de uso da IA atingido. Tente em instantes.'); e.code = 'rate_limited'; throw e; }
  if (r.status === 401 || r.status === 403) { const e = new Error('A chave da IA foi recusada. Confira ANTHROPIC_API_KEY no servidor.'); e.code = 'ia_chave'; throw e; }
  if (r.status === 400 && r.json && /image/i.test(JSON.stringify(r.json))) { const e = new Error('A imagem não foi aceita (muito grande ou ilegível).'); e.code = 'image_rejected'; throw e; }
  if (r.status < 200 || r.status >= 300 || !r.json) { const e = new Error('A IA não respondeu (código ' + r.status + ').'); e.code = 'ia_erro'; throw e; }
  const texto = (r.json.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  return { json: extraiJson(texto), modelo, uso: r.json.usage || null };
}
module.exports = { lerJson, extraiJson, MODELOS };
