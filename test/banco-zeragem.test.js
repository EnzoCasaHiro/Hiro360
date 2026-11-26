'use strict';
/* Banco de horas: "zerar o banco de todos a partir de uma data" (rode com: npm test) — dados inventados
   - o saldo dos dias antes da data e os lançamentos antes dela deixam de contar, para todos
   - do dia da zeragem em diante, tudo conta normalmente
   - meses anteriores à zeragem continuam mostrando o histórico como era */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');

const ler = f => fs.readFileSync(path.join(__dirname, '../src/app', f), 'utf8').replace(/\r\n/g, '\n');
const trecho = (f, ini, fim) => { const s = ler(f), a = s.indexOf(ini), b = s.indexOf(fim, a); assert.ok(a >= 0 && b > a, 'trecho não encontrado em ' + f); return s.slice(a, b); };
const linha = (f, re) => { const m = ler(f).match(re); assert.ok(m, 'trecho não encontrado em ' + f); return m[0]; };

// saldo de cada dia por período de referência (26 a 25)
const DIAS = { '2026-08-26': [['2026-09-10', 60]], '2026-09-26': [['2026-09-29', 30], ['2026-10-05', 20]], '2026-10-26': [['2026-11-03', -15]] };
function banco(zera) {
  const ig = { id: 'a', nome: 'Ana' };
  const ctx = {
    S: { marcacoes: {}, config: { x_gp: { bh: { inicio: '2026-09', limiteH: 40, ...(zera ? { zera } : {}) } } },
      bh: { l1: { integ: 'a', data: '2026-09-28', h: -1 }, l2: { integ: 'a', data: '2026-10-10', h: -0.5 } } },
    hojeIso: () => '2026-12-31',
    calcSilencioso: ini => { const rows = (DIAS[ini] || []).map(([day, saldo]) => ({ day, saldo })); const s = rows.reduce((t, r) => t + r.saldo, 0);
      return { users: [{ ig, rows, t: { saldo: s, mais: Math.max(0, s), menos: Math.min(0, s), worked: 0, expected: 0 } }] }; }
  };
  vm.createContext(ctx);
  vm.runInContext([
    linha('002-motor-de-ponto-mantido.js', /function isoDate.*\n/), linha('002-motor-de-ponto-mantido.js', /function addDaysIso.*\n/),
    trecho('005-utilidades.js', '/* >>> periodo-ref */', '/* <<< periodo-ref */'),
    linha('030-extras-nucleo.js', /const xs=.*\n/), linha('030-extras-nucleo.js', /const xcfg=.*\n/),
    trecho('031-gestao-de-pessoas.js', 'const fimCalc=', '\n// banco de horas de um mês para a folha'),
    'this.f={bhSaldos};'
  ].join('\n'), ctx);
  return ym => { const x = ctx.f.bhSaldos(ym).por.get('a'); return { ant: x.ant, mes: x.mes, lanc: x.lanc, acum: x.acum }; };
}

test('sem zeragem: soma tudo desde o início do controle', () => {
  assert.deepStrictEqual(banco()('2026-11'), { ant: 60 + 50 - 90, mes: -15, lanc: 0, acum: 5 });
});

test('zerado em 01/10: o que veio antes (saldo de 29/09 e lançamento de 28/09) não conta mais', () => {
  const b = banco('2026-10-01');
  // mês da zeragem: o saldo do período aparece inteiro e a parte de antes de 01/10 sai em "compensado / pago"
  assert.deepStrictEqual(b('2026-10'), { ant: 0, mes: 50, lanc: -30 - 30, acum: -10 });
  // mês seguinte: o banco anterior começa em 01/10
  assert.deepStrictEqual(b('2026-11'), { ant: -10, mes: -15, lanc: 0, acum: -25 });
});

test('meses antes da zeragem continuam com o histórico de antes', () => {
  assert.deepStrictEqual(banco('2026-10-01')('2026-09'), { ant: 0, mes: 60, lanc: 0, acum: 60 });
});
