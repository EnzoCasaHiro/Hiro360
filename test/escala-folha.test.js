'use strict';
/* Escala mostrada na folha de ponto (rode com: npm test) — dados inventados
   quando o previsto foi lançado à mão no ponto, a folha mostra a escala que valeu de fato, não a do turno do cadastro */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ler = f => fs.readFileSync(path.join(__dirname, '../src/app', f), 'utf8').replace(/\r\n/g, '\n');
const trecho = (f, ini, fim) => { const s = ler(f), a = s.indexOf(ini), b = s.indexOf(fim, a); assert.ok(a >= 0 && b > a, 'trecho não encontrado em ' + f); return s.slice(a, b); };
const linha = (f, re) => { const m = ler(f).match(re); assert.ok(m, 'trecho não encontrado em ' + f); return m[0]; };

function ctx() {
  const c = { escalasTexto: () => 'DO CADASTRO', escalaMinSemana: () => 54 * 60, igNaData: g => g };
  vm.createContext(c);
  vm.runInContext([ler('002-motor-de-ponto-mantido.js'), trecho('009-turnos-integrantes.js', 'const WD_FULL', 'function shiftSummary'),
    trecho('004-ajustes-de-escala-por-dia.js', '// escala que de fato valeu', 'function escalasTexto('), 'this.f={escalaDaFolha};'].join('\n'), c);
  return c.f.escalaDaFolha;
}
// 26/10 (segunda) a 25/11: seg a sáb com 7h20 lançadas à mão, um domingo trabalhado
function linhas(flag) {
  const rows = []; let d = new Date(Date.UTC(2026, 9, 26));
  while (d <= new Date(Date.UTC(2026, 10, 25))) {
    const iso = d.toISOString().slice(0, 10), w = (d.getUTCDay() + 6) % 7;
    rows.push({ day: iso, expectedMin: w < 6 || iso === '2026-11-08' ? 440 : 0, flags: flag ? ['previsto_manual'] : [] });
    d = new Date(d.getTime() + 86400000);
  }
  return rows;
}
const R = { start: '2026-10-26', end: '2026-11-25' };

test('previsto lançado à mão: a folha mostra 44h (seg a sáb), não as horas do turno do cadastro', () => {
  const e = ctx()({ ig: { id: 'a' }, rows: linhas(true) }, R);
  assert.strictEqual(e.min, 44 * 60);
  assert.match(e.texto, /^44h semanais \(Seg, Ter, Qua, Qui, Sex, Sáb\)/);
});

test('sem previsto lançado à mão: continua a escala do cadastro', () => {
  const e = ctx()({ ig: { id: 'a' }, rows: linhas(false) }, R);
  assert.strictEqual(e.texto, 'DO CADASTRO');
  assert.strictEqual(e.min, 54 * 60);
});
