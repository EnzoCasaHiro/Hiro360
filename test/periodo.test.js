'use strict';
/* Período de referência do ponto: do dia 26 do mês anterior ao dia 25 do mês (rode com: npm test) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

// funções da tela: o trecho marcado em src/app/005-utilidades.js roda isolado, com um "hoje" fixo
function tela(hoje) {
  const src = fs.readFileSync(path.join(__dirname, '../src/app/005-utilidades.js'), 'utf8');
  const a = src.indexOf('/* >>> periodo-ref */'), b = src.indexOf('/* <<< periodo-ref */');
  assert.ok(a >= 0 && b > a, 'trecho do período não encontrado em 005-utilidades.js');
  const ctx = { hojeIso: () => hoje };
  vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + ';this.f={refIni,refFim,refYm,refYmAdd,refPadrao,refRotulo};', ctx);
  return ctx.f;
}
const servidor = require('../lib/periodo');

test('referência de novembro vai de 26/10 a 25/11', () => {
  const f = tela('2026-11-18');
  assert.equal(f.refIni('2026-11'), '2026-10-26');
  assert.equal(f.refFim('2026-11'), '2026-11-25');
});

test('referência de janeiro começa em 26 de dezembro do ano anterior', () => {
  const f = tela('2026-11-18');
  assert.equal(f.refIni('2027-01'), '2026-12-26');
  assert.equal(f.refFim('2027-01'), '2027-01-25');
  assert.equal(f.refIni('2026-03'), '2026-02-26');
});

test('dia 25 fica no mês; dia 26 já é do mês seguinte', () => {
  const f = tela('2026-11-18');
  assert.equal(f.refYm('2026-11-25'), '2026-11');
  assert.equal(f.refYm('2026-11-26'), '2026-12');
  assert.equal(f.refYm('2026-12-31'), '2027-01');
  assert.equal(f.refYm('2026-10-01T07:30:00'), '2026-10');
  assert.equal(f.refYmAdd('2026-01', -1), '2025-12');
});

test('período aberto ao entrar na tela', () => {
  assert.equal(tela('2026-11-18').refPadrao(), '2026-11'); // no meio do período: o que está correndo
  assert.equal(tela('2026-11-27').refPadrao(), '2026-11'); // logo depois do corte: ainda o que acabou de fechar
  assert.equal(tela('2026-12-02').refPadrao(), '2026-12'); // passados 5 dias do corte: o novo período
});

test('rótulo mostra as duas datas', () => {
  assert.equal(tela('2026-11-18').refRotulo('2026-11'), '26/10 a 25/11/2026');
});

test('o servidor usa o mesmo corte para travar o mês fechado', () => {
  assert.equal(servidor.refYm('2026-10-26'), '2026-11');
  assert.equal(servidor.refYm('2026-11-25T23:59:00'), '2026-11');
  assert.equal(servidor.refYm('2026-12-26'), '2027-01');
  assert.equal(servidor.refYm('lixo'), null);
});
