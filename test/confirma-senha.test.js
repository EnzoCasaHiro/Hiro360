'use strict';
/* Tela bloqueada, corpo vazio e limite de armazenamento, no servidor de verdade (banco temporário). */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), os = require('os'), path = require('path');

async function sobe() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hiro-test-'));
  const env = { DATA_DIR: dir, ADMIN_USER: 'teste.admin', ADMIN_PASSWORD: 'Qv7#tLm2pZr9wK', MAX_STORAGE_GB: '0.0000001' };
  const { criaApp } = require('../server.js');
  const app = await criaApp({ env, semManutencao: true });
  await new Promise(r => app.server.listen(0, r));
  const base = 'http://127.0.0.1:' + app.server.address().port; let cookie = '';
  const req = async (m, p, json, raw) => {
    const r = await fetch(base + p, { method: m, headers: { 'x-hiro': '1', 'content-type': raw ? 'application/octet-stream' : 'application/json', cookie, 'x-type': raw ? 'application/pdf' : undefined }, body: raw || (json !== undefined ? JSON.stringify(json) : undefined) });
    const sc = r.headers.get('set-cookie'); if (sc && /hiro_sid=[^;]/.test(sc)) cookie = sc.split(';')[0];
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j };
  };
  const fecha = async () => { await app.fecha(); fs.rmSync(dir, { recursive: true, force: true }); };
  return { req, fecha };
}

test('desbloquear a tela exige a senha certa', async () => {
  const t = await sobe();
  try {
    assert.equal((await t.req('POST', '/api/login', { username: 'teste.admin', password: 'Qv7#tLm2pZr9wK' })).s, 200);
    assert.equal((await t.req('POST', '/api/me/confirma-senha', { senha: 'errada123' })).s, 401);
    assert.equal((await t.req('POST', '/api/me/confirma-senha', { senha: 'Qv7#tLm2pZr9wK' })).s, 200);
    assert.equal((await t.req('POST', '/api/me/confirma-senha', {})).s, 401); // corpo vazio: recusa limpa, não erro 500
  } finally { await t.fecha(); }
});

test('criar conta sem corpo devolve recusa, não erro interno', async () => {
  const t = await sobe();
  try {
    await t.req('POST', '/api/login', { username: 'teste.admin', password: 'Qv7#tLm2pZr9wK' });
    const r = await t.req('POST', '/api/users', null);
    assert.notEqual(r.s, 500);
  } finally { await t.fecha(); }
});

test('arquivo acima do espaço de armazenamento é recusado', async () => {
  const t = await sobe();
  try {
    await t.req('POST', '/api/login', { username: 'teste.admin', password: 'Qv7#tLm2pZr9wK' });
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(200, 0x20)]);
    const r = await t.req('POST', '/api/blob', undefined, pdf);
    assert.equal(r.s, 507);
  } finally { await t.fecha(); }
});
